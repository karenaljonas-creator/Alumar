"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, Package, TrendingUp, TrendingDown, AlertTriangle, FilterX } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { ColumnFilter } from "@/components/column-filter"
import { useTableFilters, type TableColumnDef } from "@/lib/use-table-filters"

interface EstoqueItem {
  codigo: string
  descricao: string
  totalEntrada: number
  totalSaida: number
  saldo: number
  valorMedioUnitario: number
  valorTotalEstoque: number
}

export function EstoqueSaldo() {
  const [entradas, setEntradas] = useState<any[]>([])
  const [saidas, setSaidas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
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

  const formatCurrencyVal = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0)

  const colunas = useMemo<TableColumnDef<EstoqueItem>[]>(
    () => [
      { key: "codigo", value: (i) => i.codigo },
      { key: "descricao", value: (i) => i.descricao },
      { key: "totalEntrada", numeric: true, value: (i) => String(i.totalEntrada ?? 0) },
      { key: "totalSaida", numeric: true, value: (i) => String(i.totalSaida ?? 0) },
      { key: "saldo", numeric: true, value: (i) => String(i.saldo ?? 0) },
      {
        key: "valorMedioUnitario",
        numeric: true,
        value: (i) => formatCurrencyVal(i.valorMedioUnitario),
        sortValue: (i) => i.valorMedioUnitario || 0,
      },
      {
        key: "valorTotalEstoque",
        numeric: true,
        value: (i) => formatCurrencyVal(i.valorTotalEstoque),
        sortValue: (i) => i.valorTotalEstoque || 0,
      },
    ],
    [],
  )

  const searchPredicate = useCallback(
    (i: EstoqueItem, termo: string) =>
      i.codigo.toLowerCase().includes(termo) || i.descricao.toLowerCase().includes(termo),
    [],
  )

  const {
    linhas: filteredEstoque,
    filtros,
    ordenacao,
    universoPorColuna,
    contagensPorColuna,
    setFiltroColuna,
    ordenarColuna,
    limparTudo,
    filtrosAtivos,
  } = useTableFilters<EstoqueItem>({
    rows: estoqueCalculado,
    columns: colunas,
    storageKey: "estoque-saldo-filtros-v1",
    searchTerm,
    searchPredicate,
  })

  const renderFiltro = (key: string, align: "start" | "center" | "end" = "start") => (
    <ColumnFilter
      options={universoPorColuna[key] ?? []}
      counts={contagensPorColuna[key] ?? {}}
      selected={filtros[key] ?? null}
      onChange={(sel) => setFiltroColuna(key, sel)}
      sortDir={ordenacao?.key === key ? ordenacao.dir : null}
      onSort={(dir) => ordenarColuna(key, dir)}
      align={align}
    />
  )

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
  }

  // Estatísticas
  const totalPNs = filteredEstoque.length
  const totalItensEstoque = filteredEstoque.reduce((acc, item) => acc + Math.max(0, item.saldo), 0)
  const valorTotalEstoque = filteredEstoque.reduce((acc, item) => acc + Math.max(0, item.valorTotalEstoque), 0)

  // Função para mapear origem para categoria
  const getOrigemKey = (origem: string): string => {
    const origemLower = (origem || "").toLowerCase().trim()
    if (origemLower.includes("estratégico") || origemLower.includes("estrategico")) {
      return "Estoque Estratégico"
    } else if (origemLower.includes("corretiva") || origemLower.includes("contrato")) {
      return "Corretiva Contrato"
    } else if (origemLower.includes("plano") || origemLower.includes("manutenção") || origemLower.includes("manutencao") || origemLower.includes("preventiva") || origemLower.includes("preventivo")) {
      return "Plano Manutenção"
    } else if (origemLower.includes("acordo") && origemLower.includes("inicial")) {
      return "Acordo inicial"
    }
    return ""
  }

  // Calcular valores por origem - EXATO usando FIFO por código
  const valoresPorOrigem = useMemo(() => {
    const origens = {
      "Estoque Estratégico": 0,
      "Corretiva Contrato": 0,
      "Plano Manutenção": 0,
      "Acordo inicial": 0,
    }

    // Agrupar entradas por código
    const entradasPorCodigo: Record<string, Array<{ origem: string; quantidade: number; valorUnitario: number; data: string }>> = {}
    
    entradas.forEach((entrada) => {
      const codigo = entrada.codigo
      if (!entradasPorCodigo[codigo]) {
        entradasPorCodigo[codigo] = []
      }
      const valorUnitario = entrada.quantidade > 0 ? (entrada.valor_total || 0) / entrada.quantidade : 0
      entradasPorCodigo[codigo].push({
        origem: getOrigemKey(entrada.origem || ""),
        quantidade: entrada.quantidade || 0,
        valorUnitario,
        data: entrada.data_emissao || ""
      })
    })

    // Ordenar entradas por data (FIFO)
    Object.keys(entradasPorCodigo).forEach((codigo) => {
      entradasPorCodigo[codigo].sort((a, b) => a.data.localeCompare(b.data))
    })

    // Agrupar saídas por código
    const saidasPorCodigo: Record<string, number> = {}
    saidas.forEach((saida) => {
      saidasPorCodigo[saida.codigo] = (saidasPorCodigo[saida.codigo] || 0) + (saida.quantidade || 0)
    })

    // Para cada código, calcular o saldo por origem usando FIFO
    Object.keys(entradasPorCodigo).forEach((codigo) => {
      const entradasDoCodigo = entradasPorCodigo[codigo]
      let saidaRestante = saidasPorCodigo[codigo] || 0

      entradasDoCodigo.forEach((entrada) => {
        let qtdDisponivel = entrada.quantidade
        
        // Subtrair saídas (FIFO)
        if (saidaRestante > 0) {
          const qtdUsada = Math.min(saidaRestante, qtdDisponivel)
          qtdDisponivel -= qtdUsada
          saidaRestante -= qtdUsada
        }

        // Adicionar valor restante à origem correspondente
        if (qtdDisponivel > 0 && entrada.origem) {
          origens[entrada.origem as keyof typeof origens] += qtdDisponivel * entrada.valorUnitario
        }
      })
    })

    return origens
  }, [entradas, saidas])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Estoque de Peças</h2>
          <p className="text-sm text-muted-foreground">Saldo atual por código (PN) = Entrada - Saída</p>
        </div>
      </div>

      {/* Resumo geral */}
      <div className="grid grid-cols-3 gap-4">
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor Total em Estoque</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(valorTotalEstoque)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Valores por Origem */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Estoque Estratégico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-primary">{formatCurrency(valoresPorOrigem["Estoque Estratégico"])}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Itens Corretivos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-primary">{formatCurrency(valoresPorOrigem["Corretiva Contrato"])}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Itens Preventivos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-primary">{formatCurrency(valoresPorOrigem["Plano Manutenção"])}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Acordo Inicial</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-primary">{formatCurrency(valoresPorOrigem["Acordo inicial"])}</div>
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
            <div className="flex items-center gap-2">
              {filtrosAtivos && (
                <Button onClick={limparTudo} variant="outline" size="sm" className="gap-1">
                  <FilterX className="h-4 w-4" />
                  Limpar filtros
                </Button>
              )}
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
                      <div className="flex items-center font-medium">Código (PN) {renderFiltro("codigo")}</div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center font-medium">Descrição {renderFiltro("descricao")}</div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center font-medium">
                        <TrendingUp className="h-4 w-4 mr-1 text-primary" />
                        Entrada {renderFiltro("totalEntrada", "center")}
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center font-medium">
                        <TrendingDown className="h-4 w-4 mr-1 text-muted-foreground" />
                        Saída {renderFiltro("totalSaida", "center")}
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center font-medium">Saldo {renderFiltro("saldo", "center")}</div>
                    </TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center justify-end font-medium">Valor Médio Unit. {renderFiltro("valorMedioUnitario", "end")}</div>
                    </TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center justify-end font-medium">Valor Total {renderFiltro("valorTotalEstoque", "end")}</div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEstoque.map((item) => (
                    <TableRow key={item.codigo} className={item.saldo < 0 ? "bg-destructive/10" : item.saldo === 0 ? "bg-muted" : ""}>
                      <TableCell className="font-mono font-medium">{item.codigo}</TableCell>
                      <TableCell className="max-w-[250px] truncate">{item.descricao}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          +{item.totalEntrada}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                          -{item.totalSaida}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {item.saldo < 0 && <AlertTriangle className="h-4 w-4 text-destructive" />}
                          <span className={`font-bold ${item.saldo < 0 ? "text-destructive" : item.saldo === 0 ? "text-muted-foreground" : "text-foreground"}`}>
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
