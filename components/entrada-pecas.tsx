"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Edit, Trash2, Package, FilterX } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { formatDateOnly } from "@/lib/utils"
import { ColumnFilter } from "@/components/column-filter"
import { useTableFilters, type TableColumnDef } from "@/lib/use-table-filters"

interface EstoquePeca {
  id: string
  codigo: string
  descricao: string
  quantidade: number
  ordem_servico: string
  numero_serie: string
  nota_fiscal: string
  data_emissao: string
  valor_unitario: number
  valor_total: number
  origem: string
  observacao: string
  created_at: string
  updated_at?: string
}

const ORIGENS = [
  "Estoque estratégico - corretivos",
  "Corretiva Contrato",
  "Plano - Manutenção Preventiva",
  "Acordo inicial",
]

export function EntradaPecas() {
  const [pecas, setPecas] = useState<EstoquePeca[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPeca, setEditingPeca] = useState<EstoquePeca | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [buscaNF, setBuscaNF] = useState("")
  const [buscandoNF, setBuscandoNF] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    codigo: "",
    descricao: "",
    quantidade: 1,
    ordem_servico: "",
    numero_serie: "",
    nota_fiscal: "",
    data_emissao: new Date().toISOString().split("T")[0],
    valor_unitario: 0,
    origem: "",
    observacao: "",
  })

  const loadPecas = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("estoque_pecas")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      toast({ title: "Erro ao carregar estoque", description: error.message, variant: "destructive" })
    } else {
      setPecas(data || [])
    }
    setLoading(false)
  }, [supabase, toast])

  useEffect(() => {
    loadPecas()
  }, [loadPecas])

  // Buscar itens por Nota Fiscal
  const handleBuscarNF = async () => {
    if (!buscaNF.trim()) {
      toast({ title: "Digite o número da Nota Fiscal", variant: "destructive" })
      return
    }

    setBuscandoNF(true)
    const { data, error } = await supabase
      .from("estoque_pecas")
      .select("*")
      .ilike("nota_fiscal", `%${buscaNF.trim()}%`)
      .order("created_at", { ascending: false })

    if (error) {
      toast({ title: "Erro ao buscar NF", description: error.message, variant: "destructive" })
    } else if (data && data.length > 0) {
      setPecas(data)
      setSearchTerm("")
      toast({ title: "Encontrado!", description: `${data.length} item(ns) com a NF ${buscaNF}` })
    } else {
      setPecas([])
      toast({ title: "Nota Fiscal não encontrada", description: "Nenhum item com essa NF foi encontrado.", variant: "destructive" })
    }
    setBuscandoNF(false)
  }

  const handleLimparBuscaNF = () => {
    setBuscaNF("")
    loadPecas()
  }

  const formatCurrencyVal = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0)

  const dataAtualizacaoISO = (p: EstoquePeca) => p.updated_at || p.created_at

  const colunas = useMemo<TableColumnDef<EstoquePeca>[]>(
    () => [
      { key: "codigo", value: (p) => p.codigo },
      { key: "descricao", value: (p) => p.descricao },
      { key: "quantidade", numeric: true, value: (p) => String(p.quantidade ?? 0) },
      { key: "ordem_servico", value: (p) => p.ordem_servico },
      { key: "numero_serie", value: (p) => p.numero_serie },
      { key: "nota_fiscal", value: (p) => p.nota_fiscal },
      {
        key: "data_emissao",
        value: (p) => (p.data_emissao ? formatDateOnly(p.data_emissao) : "-"),
        sortValue: (p) => p.data_emissao || "",
      },
      {
        key: "valor_unitario",
        numeric: true,
        value: (p) => formatCurrencyVal(p.valor_unitario),
        sortValue: (p) => p.valor_unitario || 0,
      },
      {
        key: "valor_total",
        numeric: true,
        value: (p) => formatCurrencyVal(p.valor_total),
        sortValue: (p) => p.valor_total || 0,
      },
      { key: "origem", value: (p) => p.origem || "-" },
      { key: "observacao", value: (p) => p.observacao || "-" },
      {
        key: "data_atualizacao",
        value: (p) =>
          new Date(dataAtualizacaoISO(p)).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }),
        sortValue: (p) => dataAtualizacaoISO(p),
      },
    ],
    [],
  )

  const searchPredicate = useCallback(
    (p: EstoquePeca, termo: string) =>
      p.codigo.toLowerCase().includes(termo) ||
      p.descricao.toLowerCase().includes(termo) ||
      p.ordem_servico.toLowerCase().includes(termo),
    [],
  )

  const {
    linhas: filteredPecas,
    filtros,
    ordenacao,
    universoPorColuna,
    contagensPorColuna,
    setFiltroColuna,
    ordenarColuna,
    limparTudo,
    filtrosAtivos,
  } = useTableFilters<EstoquePeca>({
    rows: pecas,
    columns: colunas,
    storageKey: "entrada-pecas-filtros-v1",
    searchTerm,
    searchPredicate,
  })

  // Renderiza o filtro de coluna no cabeçalho
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const valorTotal = formData.quantidade * formData.valor_unitario

    if (editingPeca) {
      const { error } = await supabase
        .from("estoque_pecas")
        .update({
          ...formData,
          valor_total: valorTotal,
        })
        .eq("id", editingPeca.id)

      if (error) {
        toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" })
      } else {
        toast({ title: "Peça atualizada com sucesso!" })
        loadPecas()
        resetForm()
      }
    } else {
      const { error } = await supabase
        .from("estoque_pecas")
        .insert({
          ...formData,
          valor_total: valorTotal,
        })

      if (error) {
        toast({ title: "Erro ao cadastrar", description: error.message, variant: "destructive" })
      } else {
        toast({ title: "Peça cadastrada com sucesso!" })
        loadPecas()
        resetForm()
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta peça?")) return

    const { error } = await supabase.from("estoque_pecas").delete().eq("id", id)
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "Peça excluída com sucesso!" })
      loadPecas()
    }
  }

  const handleEdit = (peca: EstoquePeca) => {
    setEditingPeca(peca)
    setFormData({
      codigo: peca.codigo,
      descricao: peca.descricao,
      quantidade: peca.quantidade,
      ordem_servico: peca.ordem_servico,
      numero_serie: peca.numero_serie,
      nota_fiscal: peca.nota_fiscal,
      data_emissao: peca.data_emissao,
      valor_unitario: peca.valor_unitario,
      origem: peca.origem,
      observacao: peca.observacao || "",
    })
    setDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      codigo: "",
      descricao: "",
      quantidade: 1,
      ordem_servico: "",
      numero_serie: "",
      nota_fiscal: "",
      data_emissao: new Date().toISOString().split("T")[0],
      valor_unitario: 0,
      origem: "",
      observacao: "",
    })
    setEditingPeca(null)
    setDialogOpen(false)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
  }

  const totalEstoque = filteredPecas.reduce((acc, p) => acc + p.valor_total, 0)
  const totalItens = filteredPecas.reduce((acc, p) => acc + p.quantidade, 0)

  // Calcular valores por origem na entrada
  const valoresPorOrigemEntrada = {
    "Estoque Estratégico": 0,
    "Itens Corretivos": 0,
    "Itens Preventivos": 0,
    "Acordo Inicial": 0,
  }

  filteredPecas.forEach((peca) => {
    const origem = (peca.origem || "").toLowerCase().trim()
    const valor = peca.valor_total || 0

    if (!origem) return

    if (origem.includes("estratégico") || origem.includes("estrategico")) {
      valoresPorOrigemEntrada["Estoque Estratégico"] += valor
    } else if (origem.includes("corretiva") || origem.includes("contrato")) {
      valoresPorOrigemEntrada["Itens Corretivos"] += valor
    } else if (origem.includes("plano") || origem.includes("manutenção") || origem.includes("manutencao") || origem.includes("preventiva") || origem.includes("preventivo")) {
      valoresPorOrigemEntrada["Itens Preventivos"] += valor
    } else if (origem.includes("acordo") && origem.includes("inicial")) {
      valoresPorOrigemEntrada["Acordo Inicial"] += valor
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Entrada de Peças</h2>
          <p className="text-sm text-muted-foreground">Registro de entrada de peças no estoque</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setDialogOpen(true) }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Entrada
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingPeca ? "Editar Peça" : "Registrar Entrada de Peça"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código (PN)</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    placeholder="Ex: 1613610590"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Input
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Ex: FILTRO DE OLEO"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantidade">Quantidade</Label>
                  <Input
                    id="quantidade"
                    type="number"
                    min="1"
                    value={formData.quantidade}
                    onChange={(e) => setFormData({ ...formData, quantidade: parseInt(e.target.value) || 1 })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ordem_servico">Ordem de Serviço</Label>
                  <Input
                    id="ordem_servico"
                    value={formData.ordem_servico}
                    onChange={(e) => setFormData({ ...formData, ordem_servico: e.target.value })}
                    placeholder="Ex: BRP075252"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero_serie">Nº Série</Label>
                  <Input
                    id="numero_serie"
                    value={formData.numero_serie}
                    onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
                    placeholder="Ex: 276495"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nota_fiscal">Nota Fiscal</Label>
                  <Input
                    id="nota_fiscal"
                    value={formData.nota_fiscal}
                    onChange={(e) => setFormData({ ...formData, nota_fiscal: e.target.value })}
                    placeholder="Ex: 409761560"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_emissao">Data Emissão</Label>
                  <Input
                    id="data_emissao"
                    type="date"
                    value={formData.data_emissao}
                    onChange={(e) => setFormData({ ...formData, data_emissao: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valor_unitario">Valor Unitário (R$)</Label>
                  <Input
                    id="valor_unitario"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.valor_unitario}
                    onChange={(e) => setFormData({ ...formData, valor_unitario: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="origem">Origem</Label>
                  <Select value={formData.origem} onValueChange={(v) => setFormData({ ...formData, origem: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a origem" />
                    </SelectTrigger>
                    <SelectContent>
                      {ORIGENS.map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="observacao">Observação</Label>
                  <Input
                    id="observacao"
                    value={formData.observacao}
                    onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                    placeholder="Ex: UTILIZAR NO CB-2316SA-04 EM DEZEMBRO/2025"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button type="submit">{editingPeca ? "Salvar Alterações" : "Cadastrar"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Estoque Estratégico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-primary">{formatCurrency(valoresPorOrigemEntrada["Estoque Estratégico"])}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Itens Corretivos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-primary">{formatCurrency(valoresPorOrigemEntrada["Itens Corretivos"])}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Itens Preventivos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-primary">{formatCurrency(valoresPorOrigemEntrada["Itens Preventivos"])}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Acordo Inicial</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-primary">{formatCurrency(valoresPorOrigemEntrada["Acordo Inicial"])}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Registros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredPecas.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor Total em Estoque</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(totalEstoque)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Registro de Entradas
            </CardTitle>
            <div className="flex gap-2 items-center">
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar por NF..."
                  value={buscaNF}
                  onChange={(e) => setBuscaNF(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleBuscarNF()}
                  className="w-40"
                  disabled={buscandoNF}
                />
                <Button onClick={handleBuscarNF} disabled={buscandoNF} size="sm">
                  Buscar NF
                </Button>
                {buscaNF && (
                  <Button onClick={handleLimparBuscaNF} variant="outline" size="sm">
                    Limpar
                  </Button>
                )}
              </div>
              {filtrosAtivos && (
                <Button onClick={limparTudo} variant="outline" size="sm" className="gap-1">
                  <FilterX className="h-4 w-4" />
                  Limpar filtros
                </Button>
              )}
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código, descrição ou OS..."
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
          ) : filteredPecas.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Nenhuma peça cadastrada. Clique em &quot;Nova Entrada&quot; para adicionar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="table-fixed w-full">
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead className="w-[8%]">
                      <div className="flex items-center font-medium">Código {renderFiltro("codigo")}</div>
                    </TableHead>
                    <TableHead className="w-[12%]">
                      <div className="flex items-center font-medium">Descrição {renderFiltro("descricao")}</div>
                    </TableHead>
                    <TableHead className="w-[4%]">
                      <div className="flex items-center font-medium">Qtd {renderFiltro("quantidade", "center")}</div>
                    </TableHead>
                    <TableHead className="w-[8%]">
                      <div className="flex items-center font-medium">Ordem Serviço {renderFiltro("ordem_servico")}</div>
                    </TableHead>
                    <TableHead className="w-[8%]">
                      <div className="flex items-center font-medium">Nº Série {renderFiltro("numero_serie")}</div>
                    </TableHead>
                    <TableHead className="w-[7%]">
                      <div className="flex items-center font-medium">NF {renderFiltro("nota_fiscal")}</div>
                    </TableHead>
                    <TableHead className="w-[8%]">
                      <div className="flex items-center font-medium">Data Emissão {renderFiltro("data_emissao")}</div>
                    </TableHead>
                    <TableHead className="w-[7%]">
                      <div className="flex items-center font-medium">Valor Unit. {renderFiltro("valor_unitario", "end")}</div>
                    </TableHead>
                    <TableHead className="w-[7%]">
                      <div className="flex items-center font-medium">Valor Total {renderFiltro("valor_total", "end")}</div>
                    </TableHead>
                    <TableHead className="w-[10%]">
                      <div className="flex items-center font-medium">Origem {renderFiltro("origem")}</div>
                    </TableHead>
                    <TableHead className="w-[10%]">
                      <div className="flex items-center font-medium">Observação {renderFiltro("observacao")}</div>
                    </TableHead>
                    <TableHead className="w-[7%]">
                      <div className="flex items-center font-medium">Atualizado em {renderFiltro("data_atualizacao")}</div>
                    </TableHead>
                    <TableHead className="w-[4%] text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPecas.map((peca) => (
                    <TableRow key={peca.id}>
                      <TableCell className="font-mono font-medium">{peca.codigo}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{peca.descricao}</TableCell>
                      <TableCell className="text-center">{peca.quantidade}</TableCell>
                      <TableCell>{peca.ordem_servico}</TableCell>
                      <TableCell>{peca.numero_serie}</TableCell>
                      <TableCell>{peca.nota_fiscal}</TableCell>
                      <TableCell>
                        {formatDateOnly(peca.data_emissao)}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(peca.valor_unitario)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(peca.valor_total)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs whitespace-nowrap">
                          {peca.origem || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground" title={peca.observacao || ""}>
                        {peca.observacao || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {peca.updated_at ? new Date(peca.updated_at).toLocaleDateString("pt-BR", {day: "2-digit", month: "2-digit", year: "numeric"}) : new Date(peca.created_at).toLocaleDateString("pt-BR", {day: "2-digit", month: "2-digit", year: "numeric"})}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(peca)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(peca.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Valores por Origem */}
    </div>
  )
}
