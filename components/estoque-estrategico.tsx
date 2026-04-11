"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Search, AlertTriangle, CheckCircle, Package } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface EstoqueEstrategicoItem {
  id: number
  codigo: string
  equipamento: string
  descricao: string
  quantidade_minima: number
}

interface EntradaPeca {
  codigo: string
  quantidade: number
}

interface SaidaPeca {
  codigo: string
  quantidade: number
}

export function EstoqueEstrategico() {
  const [itensEstrategicos, setItensEstrategicos] = useState<EstoqueEstrategicoItem[]>([])
  const [entradas, setEntradas] = useState<EntradaPeca[]>([])
  const [saidas, setSaidas] = useState<SaidaPeca[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [equipamentoFilter, setEquipamentoFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    setLoading(true)
    try {
      const [estrategicoRes, entradasRes, saidasRes] = await Promise.all([
        supabase.from("estoque_estrategico").select("*").order("equipamento").order("descricao"),
        supabase.from("estoque_pecas").select("codigo, quantidade"),
        supabase.from("saida_pecas").select("codigo, quantidade"),
      ])

      if (estrategicoRes.data) setItensEstrategicos(estrategicoRes.data)
      if (entradasRes.data) setEntradas(entradasRes.data)
      if (saidasRes.data) setSaidas(saidasRes.data)
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
    }
    setLoading(false)
  }

  // Calcular saldo atual por código
  const saldoPorCodigo = useMemo(() => {
    const saldos: Record<string, number> = {}

    entradas.forEach((entrada) => {
      const codigo = entrada.codigo
      if (!saldos[codigo]) saldos[codigo] = 0
      saldos[codigo] += entrada.quantidade || 0
    })

    saidas.forEach((saida) => {
      const codigo = saida.codigo
      if (!saldos[codigo]) saldos[codigo] = 0
      saldos[codigo] -= saida.quantidade || 0
    })

    return saldos
  }, [entradas, saidas])

  // Combinar itens estratégicos com saldo atual
  const itensComSaldo = useMemo(() => {
    return itensEstrategicos.map((item) => {
      const saldoAtual = saldoPorCodigo[item.codigo] || 0
      const diferenca = saldoAtual - item.quantidade_minima
      const status = diferenca >= 0 ? "ok" : "abaixo"
      return {
        ...item,
        saldoAtual,
        diferenca,
        status,
      }
    })
  }, [itensEstrategicos, saldoPorCodigo])

  // Obter lista de equipamentos únicos
  const equipamentos = useMemo(() => {
    const unique = [...new Set(itensEstrategicos.map((item) => item.equipamento))]
    return unique.sort()
  }, [itensEstrategicos])

  // Filtrar itens
  const filteredItens = useMemo(() => {
    return itensComSaldo.filter((item) => {
      const matchesSearch =
        item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.descricao.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesEquipamento = equipamentoFilter === "all" || item.equipamento === equipamentoFilter

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "ok" && item.status === "ok") ||
        (statusFilter === "abaixo" && item.status === "abaixo")

      return matchesSearch && matchesEquipamento && matchesStatus
    })
  }, [itensComSaldo, searchTerm, equipamentoFilter, statusFilter])

  // Estatísticas
  const totalItens = itensComSaldo.length
  const itensOk = itensComSaldo.filter((item) => item.status === "ok").length
  const itensAbaixo = itensComSaldo.filter((item) => item.status === "abaixo").length
  const percentualOk = totalItens > 0 ? Math.round((itensOk / totalItens) * 100) : 0

  return (
    <div className="flex flex-col gap-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Itens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItens}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Itens OK</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold text-green-600">{itensOk}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Itens Abaixo do Mínimo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-2xl font-bold text-red-600">{itensAbaixo}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cobertura do Estoque</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{percentualOk}%</div>
            <div className="mt-1 h-2 w-full rounded-full bg-gray-200">
              <div
                className={`h-2 rounded-full ${percentualOk >= 80 ? "bg-green-600" : percentualOk >= 50 ? "bg-amber-500" : "bg-red-600"}`}
                style={{ width: `${percentualOk}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <CardTitle>Controle de Estoque Mínimo</CardTitle>
          </div>
          <div className="flex items-center gap-4">
            <SearchableSelect
              options={[{ value: "all", label: "Todos Equipamentos" }, ...equipamentos.map((equip) => ({ value: equip, label: equip }))]}
              value={equipamentoFilter}
              onValueChange={setEquipamentoFilter}
              placeholder="Equipamento"
              searchPlaceholder="Pesquisar equipamento..."
              className="w-[180px]"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="ok">OK</SelectItem>
                <SelectItem value="abaixo">Abaixo do Mínimo</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por código ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-[300px] pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <span className="text-muted-foreground">Carregando...</span>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Equipamento</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-center">Qtde Mínima</TableHead>
                    <TableHead className="text-center">Saldo Atual</TableHead>
                    <TableHead className="text-center">Diferença</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItens.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        Nenhum item encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItens.map((item) => (
                      <TableRow key={item.id} className={item.status === "abaixo" ? "bg-red-50" : ""}>
                        <TableCell className="font-mono">{item.codigo}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.equipamento}</Badge>
                        </TableCell>
                        <TableCell>{item.descricao}</TableCell>
                        <TableCell className="text-center font-medium">{item.quantidade_minima}</TableCell>
                        <TableCell className="text-center">
                          <span className={item.saldoAtual < item.quantidade_minima ? "text-red-600 font-bold" : "text-green-600 font-bold"}>
                            {item.saldoAtual}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={item.diferenca < 0 ? "text-red-600 font-bold" : "text-green-600"}>
                            {item.diferenca >= 0 ? `+${item.diferenca}` : item.diferenca}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.status === "ok" ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              OK
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              Repor
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
