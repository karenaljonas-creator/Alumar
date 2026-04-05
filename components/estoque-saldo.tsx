"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Package, ArrowUp, ArrowDown, ArrowUpDown, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface EstoqueItem {
  codigo: string
  descricao: string
  totalEntrada: number
  totalSaida: number
  saldo: number
  valorMedioUnitario: number
  valorTotalEstoque: number
}

type SortKey = "codigo" | "descricao" | "totalEntrada" | "totalSaida" | "saldo" | "valorMedioUnitario" | "valorTotalEstoque"
type SortDirection = "asc" | "desc"

export function EstoqueSaldo() {
  const [entradas, setEntradas] = useState<any[]>([])
  const [saidas, setSaidas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("codigo")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const { toast } = useToast()
  const supabase = createClient()

  const loadData = useCallback(async () => {
    setLoading(true)
    
    const [entradasRes, saidasRes] = await Promise.all([
      supabase.from("estoque_pecas").select("*"),
      supabase.from("saida_pecas").select("*")
    ])

    if (entradasRes.error) {
      toast({ title: "Erro ao carregar entradas", description: entradasRes.error.message, variant: "destructive" })
    } else {
      setEntradas(entradasRes.data || [])
    }

    if (saidasRes.error) {
      toast({ title: "Erro ao carregar saídas", description: saidasRes.error.message, variant: "destructive" })
    } else {
      setSaidas(saidasRes.data || [])
    }

    setLoading(false)
  }, [supabase, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Calcular o estoque por código (PN)
  const estoqueCalculado = useMemo(() => {
    const estoqueMap = new Map<string, EstoqueItem>()

    // Processar entradas
    entradas.forEach((entrada) => {
      const codigo = entrada.codigo
      const existing = estoqueMap.get(codigo)

      if (existing) {
        existing.totalEntrada += entrada.quantidade
        existing.valorTotalEstoque += entrada.valor_total || 0
      } else {
        estoqueMap.set(codigo, {
          codigo,
          descricao: entrada.descricao,
          totalEntrada: entrada.quantidade,
          totalSaida: 0,
          saldo: 0,
          valorMedioUnitario: entrada.valor_unitario || 0,
          valorTotalEstoque: entrada.valor_total || 0,
        })
      }
    })

    // Processar saídas
    saidas.forEach((saida) => {
      const codigo = saida.codigo
      const existing = estoqueMap.get(codigo)

      if (existing) {
        existing.totalSaida += saida.quantidade
      } else {
        // Item saiu mas não foi registrado como entrada (pode acontecer)
        estoqueMap.set(codigo, {
          codigo,
          descricao: saida.descricao,
          totalEntrada: 0,
          totalSaida: saida.quantidade,
          saldo: 0,
          valorMedioUnitario: 0,
          valorTotalEstoque: 0,
        })
      }
    })

    // Calcular saldos e valores médios
    estoqueMap.forEach((item) => {
      item.saldo = item.totalEntrada - item.totalSaida
      if (item.totalEntrada > 0) {
        item.valorMedioUnitario = item.valorTotalEstoque / item.totalEntrada
      }
      // Recalcular valor total baseado no saldo
      item.valorTotalEstoque = item.saldo * item.valorMedioUnitario
    })

    return Array.from(estoqueMap.values())
  }, [entradas, saidas])

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else {
        setSortKey("codigo")
        setSortDirection("asc")
      }
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }, [sortKey, sortDirection])

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />
    if (sortDirection === "asc") return <ArrowUp className="h-3 w-3 ml-1" />
    return <ArrowDown className="h-3 w-3 ml-1" />
  }

  const filteredEstoque = useMemo(() => {
    return estoqueCalculado
      .filter((item) =>
        item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.descricao.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        let valA: string | number = ""
        let valB: string | number = ""

        switch (sortKey) {
          case "codigo": valA = a.codigo.toLowerCase(); valB = b.codigo.toLowerCase(); break
          case "descricao": valA = a.descricao.toLowerCase(); valB = b.descricao.toLowerCase(); break
          case "totalEntrada": valA = a.totalEntrada; valB = b.totalEntrada; break
          case "totalSaida": valA = a.totalSaida; valB = b.totalSaida; break
          case "saldo": valA = a.saldo; valB = b.saldo; break
          case "valorMedioUnitario": valA = a.valorMedioUnitario; valB = b.valorMedioUnitario; break
          case "valorTotalEstoque": valA = a.valorTotalEstoque; valB = b.valorTotalEstoque; break
        }

        if (valA < valB) return sortDirection === "asc" ? -1 : 1
        if (valA > valB) return sortDirection === "asc" ? 1 : -1
        return 0
      })
  }, [estoqueCalculado, searchTerm, sortKey, sortDirection])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
  }

  // Estatísticas
  const totalPNs = filteredEstoque.length
  const totalItensEstoque = filteredEstoque.reduce((acc, item) => acc + Math.max(0, item.saldo), 0)
  const valorTotalEstoque = filteredEstoque.reduce((acc, item) => acc + Math.max(0, item.valorTotalEstoque), 0)
  const itensZerados = filteredEstoque.filter((item) => item.saldo === 0).length
  const itensNegativos = filteredEstoque.filter((item) => item.saldo < 0).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Estoque de Peças</h2>
          <p className="text-sm text-muted-foreground">Saldo atual por código (PN) = Entrada - Saída</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de PNs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPNs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Itens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItensEstoque}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(valorTotalEstoque)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Itens Zerados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{itensZerados}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Itens Negativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{itensNegativos}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Saldo de Estoque por Código (PN)
            </CardTitle>
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por código ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Carregando...</div>
          ) : filteredEstoque.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Nenhum item no estoque. Registre entradas na aba &quot;Entrada&quot;.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead>
                      <button onClick={() => handleSort("codigo")} className="flex items-center font-medium hover:text-foreground cursor-pointer">
                        Código (PN) <SortIcon columnKey="codigo" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => handleSort("descricao")} className="flex items-center font-medium hover:text-foreground cursor-pointer">
                        Descrição <SortIcon columnKey="descricao" />
                      </button>
                    </TableHead>
                    <TableHead className="text-center">
                      <button onClick={() => handleSort("totalEntrada")} className="flex items-center font-medium hover:text-foreground cursor-pointer justify-center w-full">
                        <TrendingUp className="h-4 w-4 mr-1 text-green-600" />
                        Entrada <SortIcon columnKey="totalEntrada" />
                      </button>
                    </TableHead>
                    <TableHead className="text-center">
                      <button onClick={() => handleSort("totalSaida")} className="flex items-center font-medium hover:text-foreground cursor-pointer justify-center w-full">
                        <TrendingDown className="h-4 w-4 mr-1 text-red-600" />
                        Saída <SortIcon columnKey="totalSaida" />
                      </button>
                    </TableHead>
                    <TableHead className="text-center">
                      <button onClick={() => handleSort("saldo")} className="flex items-center font-medium hover:text-foreground cursor-pointer justify-center w-full">
                        Saldo <SortIcon columnKey="saldo" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button onClick={() => handleSort("valorMedioUnitario")} className="flex items-center font-medium hover:text-foreground cursor-pointer justify-end w-full">
                        Valor Médio Unit. <SortIcon columnKey="valorMedioUnitario" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button onClick={() => handleSort("valorTotalEstoque")} className="flex items-center font-medium hover:text-foreground cursor-pointer justify-end w-full">
                        Valor Total <SortIcon columnKey="valorTotalEstoque" />
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEstoque.map((item) => (
                    <TableRow key={item.codigo} className={item.saldo < 0 ? "bg-red-50" : item.saldo === 0 ? "bg-amber-50" : ""}>
                      <TableCell className="font-mono font-medium">{item.codigo}</TableCell>
                      <TableCell className="max-w-[250px] truncate">{item.descricao}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          +{item.totalEntrada}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          -{item.totalSaida}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {item.saldo < 0 && <AlertTriangle className="h-4 w-4 text-red-600" />}
                          <span className={`font-bold ${item.saldo < 0 ? "text-red-600" : item.saldo === 0 ? "text-amber-600" : "text-foreground"}`}>
                            {item.saldo}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.valorMedioUnitario)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {item.saldo > 0 ? formatCurrency(item.valorTotalEstoque) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
