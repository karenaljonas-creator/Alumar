"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Edit, Trash2, Package, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

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
}

type SortKey = "codigo" | "descricao" | "quantidade" | "ordem_servico" | "numero_serie" | "nota_fiscal" | "data_emissao" | "valor_unitario" | "valor_total" | "origem"
type SortDirection = "asc" | "desc"

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
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
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

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else {
        setSortKey(null)
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

  const filteredPecas = pecas
    .filter((p) =>
      p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.ordem_servico.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (!sortKey) return 0
      let valA: string | number = ""
      let valB: string | number = ""

      switch (sortKey) {
        case "codigo": valA = a.codigo.toLowerCase(); valB = b.codigo.toLowerCase(); break
        case "descricao": valA = a.descricao.toLowerCase(); valB = b.descricao.toLowerCase(); break
        case "quantidade": valA = a.quantidade; valB = b.quantidade; break
        case "ordem_servico": valA = a.ordem_servico.toLowerCase(); valB = b.ordem_servico.toLowerCase(); break
        case "numero_serie": valA = a.numero_serie.toLowerCase(); valB = b.numero_serie.toLowerCase(); break
        case "nota_fiscal": valA = a.nota_fiscal.toLowerCase(); valB = b.nota_fiscal.toLowerCase(); break
        case "data_emissao": valA = a.data_emissao; valB = b.data_emissao; break
        case "valor_unitario": valA = a.valor_unitario; valB = b.valor_unitario; break
        case "valor_total": valA = a.valor_total; valB = b.valor_total; break
        case "origem": valA = a.origem.toLowerCase(); valB = b.origem.toLowerCase(); break
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1
      if (valA > valB) return sortDirection === "asc" ? 1 : -1
      return 0
    })

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
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalEstoque)}</div>
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
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead>
                      <button onClick={() => handleSort("codigo")} className="flex items-center font-medium hover:text-foreground cursor-pointer">
                        Código <SortIcon columnKey="codigo" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => handleSort("descricao")} className="flex items-center font-medium hover:text-foreground cursor-pointer">
                        Descrição <SortIcon columnKey="descricao" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => handleSort("quantidade")} className="flex items-center font-medium hover:text-foreground cursor-pointer">
                        Qtd <SortIcon columnKey="quantidade" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => handleSort("ordem_servico")} className="flex items-center font-medium hover:text-foreground cursor-pointer">
                        Ordem Serviço <SortIcon columnKey="ordem_servico" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => handleSort("numero_serie")} className="flex items-center font-medium hover:text-foreground cursor-pointer">
                        Nº Série <SortIcon columnKey="numero_serie" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => handleSort("nota_fiscal")} className="flex items-center font-medium hover:text-foreground cursor-pointer">
                        NF <SortIcon columnKey="nota_fiscal" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => handleSort("data_emissao")} className="flex items-center font-medium hover:text-foreground cursor-pointer">
                        Data Emissão <SortIcon columnKey="data_emissao" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => handleSort("valor_unitario")} className="flex items-center font-medium hover:text-foreground cursor-pointer">
                        Valor Unit. <SortIcon columnKey="valor_unitario" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => handleSort("valor_total")} className="flex items-center font-medium hover:text-foreground cursor-pointer">
                        Valor Total <SortIcon columnKey="valor_total" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => handleSort("origem")} className="flex items-center font-medium hover:text-foreground cursor-pointer">
                        Origem <SortIcon columnKey="origem" />
                      </button>
                    </TableHead>
                    <TableHead>Observação</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
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
                        {peca.data_emissao ? new Date(peca.data_emissao).toLocaleDateString("pt-BR") : "-"}
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
    </div>
  )
}
