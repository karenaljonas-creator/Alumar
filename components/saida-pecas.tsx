"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import type { Machine } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Search, Edit, Trash2, PackageMinus, ArrowUp, ArrowDown, ArrowUpDown, Check, AlertCircle, FileSearch, Loader2, Edit2, ChevronRight, ChevronDown } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface SaidaPeca {
  id: string
  codigo: string
  descricao: string
  quantidade: number
  data_saida: string
  ordem_servico: string
  nota_fiscal: string
  area: string
  compressor: string
  utilizacao: string
  observacao: string
  created_at: string
}

interface EstoquePeca {
  codigo: string
  descricao: string
}

interface EstoquePecaCompleta {
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
}

type SortKey = "codigo" | "descricao" | "quantidade" | "data_saida" | "ordem_servico" | "area" | "compressor" | "utilizacao"
type SortDirection = "asc" | "desc"

const UTILIZACOES = ["Corretiva", "Preventiva"]

interface SaidaPecasProps {
  machines: Machine[]
}

export function SaidaPecas({ machines }: SaidaPecasProps) {
  const [saidas, setSaidas] = useState<SaidaPeca[]>([])
  const [estoquePecas, setEstoquePecas] = useState<EstoquePeca[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSaida, setEditingSaida] = useState<SaidaPeca | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [codigoEncontrado, setCodigoEncontrado] = useState<boolean | null>(null)
  const [buscaNF, setBuscaNF] = useState("")
  const [itensNF, setItensNF] = useState<EstoquePecaCompleta[]>([])
  const [itensSelecionados, setItensSelecionados] = useState<Set<string>>(new Set())
  const [buscandoNF, setBuscandoNF] = useState(false)
  const [nfDialogOpen, setNfDialogOpen] = useState(false)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [showUploadDate, setShowUploadDate] = useState(false)
  const [utilizacaoFilter, setUtilizacaoFilter] = useState<string>("all")
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false)
  const [bulkEditData, setBulkEditData] = useState({
    data_saida: "",
    ordem_servico: "",
    nota_fiscal: "",
    area: "",
    compressor: "",
    utilizacao: "",
    observacao: "",
  })
  const { toast } = useToast()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    codigo: "",
    descricao: "",
    quantidade: 1,
    data_saida: new Date().toISOString().split("T")[0],
    ordem_servico: "",
    nota_fiscal: "",
    area: "",
    compressor: "",
    utilizacao: "",
    observacao: "",
  })

  // Get unique areas from machines
  const areas = [...new Set(machines.map((m) => m.localizacao))].filter(Boolean).sort()

  // Lista de utilizações únicas para o filtro
  const utilizacoesUnicas = useMemo(() => {
    const utilizacoes = new Set(saidas.map(s => s.utilizacao).filter(Boolean))
    return Array.from(utilizacoes).sort()
  }, [saidas])

  const loadSaidas = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("saida_pecas")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      toast({ title: "Erro ao carregar saídas", description: error.message, variant: "destructive" })
    } else {
      setSaidas(data || [])
    }
    setLoading(false)
  }, [supabase, toast])

  const loadEstoquePecas = useCallback(async () => {
    const { data, error } = await supabase
      .from("estoque_pecas")
      .select("codigo, descricao")
      .order("codigo")

    if (error) {
      console.error("Erro ao carregar estoque:", error)
    } else {
      // Get unique codes with their descriptions
      const uniquePecas = data?.reduce((acc: EstoquePeca[], curr) => {
        if (!acc.find((p) => p.codigo === curr.codigo)) {
          acc.push({ codigo: curr.codigo, descricao: curr.descricao })
        }
        return acc
      }, []) || []
      setEstoquePecas(uniquePecas)
    }
  }, [supabase])

  useEffect(() => {
    loadSaidas()
    loadEstoquePecas()
  }, [loadSaidas, loadEstoquePecas])

  // Buscar itens por NF
  const buscarPorNF = useCallback(async () => {
    if (!buscaNF.trim()) {
      toast({ title: "Digite um número de NF", variant: "destructive" })
      return
    }

    setBuscandoNF(true)
    const { data, error } = await supabase
      .from("estoque_pecas")
      .select("*")
      .ilike("nota_fiscal", `%${buscaNF.trim()}%`)
      .order("codigo")

    if (error) {
      toast({ title: "Erro ao buscar NF", description: error.message, variant: "destructive" })
    } else if (!data || data.length === 0) {
      toast({ title: "Nenhum item encontrado", description: `Não há itens com a NF "${buscaNF}"`, variant: "destructive" })
    } else {
      setItensNF(data)
      setItensSelecionados(new Set())
      setNfDialogOpen(true)
    }
    setBuscandoNF(false)
  }, [buscaNF, supabase, toast])

  // Toggle seleção de item
  const toggleItemSelecionado = (id: string) => {
    setItensSelecionados((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  // Selecionar/Desselecionar todos
  const toggleTodos = () => {
    if (itensSelecionados.size === itensNF.length) {
      setItensSelecionados(new Set())
    } else {
      setItensSelecionados(new Set(itensNF.map((i) => i.id)))
    }
  }

  // Usar itens selecionados
  const usarItensSelecionados = () => {
    const selecionados = itensNF.filter((i) => itensSelecionados.has(i.id))
    if (selecionados.length === 0) {
      toast({ title: "Selecione pelo menos um item", variant: "destructive" })
      return
    }

    // Se apenas um item selecionado, preenche o formulário diretamente
    if (selecionados.length === 1) {
      const item = selecionados[0]
      setFormData((prev) => ({
        ...prev,
        codigo: item.codigo,
        descricao: item.descricao,
        quantidade: item.quantidade,
        ordem_servico: item.ordem_servico || "",
        nota_fiscal: item.nota_fiscal || buscaNF || "",
      }))
      setCodigoEncontrado(true)
      setNfDialogOpen(false)
      setDialogOpen(true)
      toast({ title: "Item carregado", description: `Peça ${item.codigo} pronta para saída` })
    } else {
      // Se múltiplos itens, cria uma saída para cada
      setNfDialogOpen(false)
      criarSaidasMultiplas(selecionados)
    }
  }

  // Criar múltiplas saídas
  const criarSaidasMultiplas = async (itens: EstoquePecaCompleta[]) => {
    // Abre o dialog para preencher dados comuns (área, compressor, utilização, data)
    setFormData((prev) => ({
      ...prev,
      codigo: "",
      descricao: "",
      quantidade: 1,
    }))
    
    // Armazena os itens selecionados para processar depois
    setItensSelecionadosParaSaida(itens)
    setSaidaMultiplaDialogOpen(true)
  }

  // Estados para saída múltipla
  const [itensSelecionadosParaSaida, setItensSelecionadosParaSaida] = useState<EstoquePecaCompleta[]>([])
  const [saidaMultiplaDialogOpen, setSaidaMultiplaDialogOpen] = useState(false)

  // Processar saídas múltiplas
  const processarSaidasMultiplas = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.area || !formData.compressor || !formData.utilizacao) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" })
      return
    }

    const saidasParaInserir = itensSelecionadosParaSaida.map((item) => ({
      codigo: item.codigo,
      descricao: item.descricao,
      quantidade: item.quantidade,
      data_saida: formData.data_saida,
      ordem_servico: item.ordem_servico || formData.ordem_servico,
      nota_fiscal: item.nota_fiscal || buscaNF || "",
      area: formData.area,
      compressor: formData.compressor,
      utilizacao: formData.utilizacao,
    }))

    const { error } = await supabase
      .from("saida_pecas")
      .insert(saidasParaInserir)

    if (error) {
      toast({ title: "Erro ao registrar saídas", description: error.message, variant: "destructive" })
    } else {
      toast({ title: `${saidasParaInserir.length} saídas registradas com sucesso!` })
      loadSaidas()
      setSaidaMultiplaDialogOpen(false)
      setItensSelecionadosParaSaida([])
      resetForm()
    }
  }

  // Auto-fill description when code changes
  const handleCodigoChange = (codigo: string) => {
    setFormData((prev) => ({ ...prev, codigo }))
    
    if (codigo.length >= 3) {
      const peca = estoquePecas.find((p) => p.codigo.toLowerCase() === codigo.toLowerCase())
      if (peca) {
        setFormData((prev) => ({ ...prev, codigo: peca.codigo, descricao: peca.descricao }))
        setCodigoEncontrado(true)
      } else {
        setCodigoEncontrado(false)
      }
    } else {
      setCodigoEncontrado(null)
    }
  }

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

  const filteredSaidas = saidas
    .filter((s) => {
      const term = searchTerm.toLowerCase()
      const matchesSearch = (
        s.codigo.toLowerCase().includes(term) ||
        s.descricao.toLowerCase().includes(term) ||
        s.ordem_servico.toLowerCase().includes(term) ||
        (s.nota_fiscal || "").toLowerCase().includes(term) ||
        s.compressor.toLowerCase().includes(term) ||
        s.area.toLowerCase().includes(term) ||
        (s.observacao || "").toLowerCase().includes(term)
      )
      const matchesUtilizacao = utilizacaoFilter === "all" || s.utilizacao === utilizacaoFilter
      return matchesSearch && matchesUtilizacao
    })
    .sort((a, b) => {
      if (!sortKey) return 0
      let valA: string | number = ""
      let valB: string | number = ""

      switch (sortKey) {
        case "codigo": valA = a.codigo.toLowerCase(); valB = b.codigo.toLowerCase(); break
        case "descricao": valA = a.descricao.toLowerCase(); valB = b.descricao.toLowerCase(); break
        case "quantidade": valA = a.quantidade; valB = b.quantidade; break
        case "data_saida": valA = a.data_saida; valB = b.data_saida; break
        case "ordem_servico": valA = a.ordem_servico.toLowerCase(); valB = b.ordem_servico.toLowerCase(); break
        case "area": valA = a.area.toLowerCase(); valB = b.area.toLowerCase(); break
        case "compressor": valA = a.compressor.toLowerCase(); valB = b.compressor.toLowerCase(); break
        case "utilizacao": valA = a.utilizacao.toLowerCase(); valB = b.utilizacao.toLowerCase(); break
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1
      if (valA > valB) return sortDirection === "asc" ? 1 : -1
      return 0
    })

  // Alias for sorted and filtered list
  const sortedAndFilteredSaidas = filteredSaidas

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (editingSaida) {
      const { error } = await supabase
        .from("saida_pecas")
        .update(formData)
        .eq("id", editingSaida.id)

      if (error) {
        toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" })
      } else {
        toast({ title: "Saída atualizada com sucesso!" })
        loadSaidas()
        resetForm()
      }
    } else {
      const { error } = await supabase
        .from("saida_pecas")
        .insert(formData)

      if (error) {
        toast({ title: "Erro ao cadastrar", description: error.message, variant: "destructive" })
      } else {
        toast({ title: "Saída registrada com sucesso!" })
        loadSaidas()
        resetForm()
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta saída?")) return

    const { error } = await supabase.from("saida_pecas").delete().eq("id", id)
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "Saída excluída com sucesso!" })
      loadSaidas()
    }
  }

  const handleEdit = (saida: SaidaPeca) => {
    setEditingSaida(saida)
    setFormData({
      codigo: saida.codigo,
      descricao: saida.descricao,
      quantidade: saida.quantidade,
      data_saida: saida.data_saida,
      ordem_servico: saida.ordem_servico,
      nota_fiscal: saida.nota_fiscal || "",
      area: saida.area,
      compressor: saida.compressor,
      utilizacao: saida.utilizacao,
      observacao: saida.observacao || "",
    })
    setCodigoEncontrado(true)
    setDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      codigo: "",
      descricao: "",
      quantidade: 1,
      data_saida: new Date().toISOString().split("T")[0],
      ordem_servico: "",
      nota_fiscal: "",
      area: "",
      compressor: "",
      utilizacao: "",
      observacao: "",
    })
    setEditingSaida(null)
    setCodigoEncontrado(null)
    setDialogOpen(false)
  }

  // Filter machines by selected area
  const machinesInArea = formData.area
    ? machines.filter((m) => m.localizacao === formData.area)
    : machines

  // Bulk edit machines filter
  const bulkMachinesInArea = bulkEditData.area
    ? machines.filter((m) => m.localizacao === bulkEditData.area)
    : machines

  // Toggle row selection
  const toggleRowSelection = (id: string) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  // Select/deselect all visible rows
  const toggleSelectAll = () => {
    const visibleIds = sortedAndFilteredSaidas.map((s) => s.id)
    if (selectedRows.size === visibleIds.length && visibleIds.every((id) => selectedRows.has(id))) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(visibleIds))
    }
  }

  // Open bulk edit dialog
  const openBulkEdit = () => {
    setBulkEditData({
      data_saida: "",
      ordem_servico: "",
      nota_fiscal: "",
      area: "",
      compressor: "",
      utilizacao: "",
      observacao: "",
    })
    setBulkEditDialogOpen(true)
  }

  // Process bulk edit
  const handleBulkEdit = async () => {
    if (selectedRows.size === 0) {
      toast({ title: "Selecione pelo menos um item", variant: "destructive" })
      return
    }

    const updates: Record<string, string | number> = {}
    if (bulkEditData.data_saida) updates.data_saida = bulkEditData.data_saida
    if (bulkEditData.ordem_servico) updates.ordem_servico = bulkEditData.ordem_servico
    if (bulkEditData.nota_fiscal) updates.nota_fiscal = bulkEditData.nota_fiscal
    if (bulkEditData.area) updates.area = bulkEditData.area
    if (bulkEditData.compressor) updates.compressor = bulkEditData.compressor
    if (bulkEditData.utilizacao) updates.utilizacao = bulkEditData.utilizacao
    if (bulkEditData.observacao) updates.observacao = bulkEditData.observacao

    if (Object.keys(updates).length === 0) {
      toast({ title: "Preencha ao menos um campo para alterar", variant: "destructive" })
      return
    }

    const { error } = await supabase
      .from("saida_pecas")
      .update(updates)
      .in("id", Array.from(selectedRows))

    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" })
    } else {
      toast({ title: `${selectedRows.size} registros atualizados com sucesso!` })
      loadSaidas()
      setSelectedRows(new Set())
      setBulkEditDialogOpen(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Saída de Peças</h2>
          <p className="text-sm text-muted-foreground">Registro de saída de peças do estoque</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedRows.size > 0 && (
            <Button variant="secondary" className="gap-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-900 border border-yellow-300" onClick={openBulkEdit}>
              <Edit2 className="h-4 w-4" />
              Editar {selectedRows.size} selecionados
            </Button>
          )}
          {selectedRows.size > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedRows(new Set())}>
              Limpar seleção
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setDialogOpen(true) }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Saída
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingSaida ? "Editar Saída" : "Registrar Saída de Peça"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Busca por NF */}
              {!editingSaida && (
                <div className="bg-muted/50 p-3 rounded-lg border border-dashed">
                  <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                    <FileSearch className="h-4 w-4" />
                    Buscar itens por Nota Fiscal
                  </Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      placeholder="Digite o número da NF..."
                      value={buscaNF}
                      onChange={(e) => setBuscaNF(e.target.value)}
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          buscarPorNF()
                        }
                      }}
                    />
                    <Button type="button" variant="secondary" onClick={buscarPorNF} disabled={buscandoNF}>
                      {buscandoNF ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Busque pela NF da Entrada para carregar os itens automaticamente
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código (PN)</Label>
                  <div className="relative">
                    <Input
                      id="codigo"
                      value={formData.codigo}
                      onChange={(e) => handleCodigoChange(e.target.value)}
                      placeholder="Digite o código da peça"
                      required
                      list="codigos-list"
                      className={codigoEncontrado === true ? "border-green-500 pr-10" : codigoEncontrado === false ? "border-amber-500 pr-10" : ""}
                    />
                    {codigoEncontrado === true && (
                      <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
                    )}
                    {codigoEncontrado === false && (
                      <AlertCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-500" />
                    )}
                  </div>
                  <datalist id="codigos-list">
                    {estoquePecas.map((p) => (
                      <option key={p.codigo} value={p.codigo}>{p.descricao}</option>
                    ))}
                  </datalist>
                  {codigoEncontrado === true && (
                    <p className="text-xs text-green-600">Código encontrado no estoque!</p>
                  )}
                  {codigoEncontrado === false && (
                    <p className="text-xs text-amber-600">Código não encontrado no estoque. Você pode preencher a descrição manualmente.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Input
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Preenchido automaticamente"
                    required
                    readOnly={codigoEncontrado === true}
                    className={codigoEncontrado === true ? "bg-muted" : ""}
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
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
                  <Label htmlFor="data_saida">Data</Label>
                  <Input
                    id="data_saida"
                    type="date"
                    value={formData.data_saida}
                    onChange={(e) => setFormData({ ...formData, data_saida: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ordem_servico">Ordem de Serviço</Label>
                  <Input
                    id="ordem_servico"
                    value={formData.ordem_servico}
                    onChange={(e) => setFormData({ ...formData, ordem_servico: e.target.value })}
                    placeholder="Ex: 408103074"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nota_fiscal">Nota Fiscal</Label>
                  <Input
                    id="nota_fiscal"
                    value={formData.nota_fiscal}
                    onChange={(e) => setFormData({ ...formData, nota_fiscal: e.target.value })}
                    placeholder="Ex: 276521-15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="area">Área</Label>
                  <SearchableSelect
                    options={areas.map((a) => ({ value: a, label: a }))}
                    value={formData.area}
                    onValueChange={(v) => setFormData({ ...formData, area: v, compressor: "" })}
                    placeholder="Selecione a área"
                    searchPlaceholder="Pesquisar área..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="compressor">Equipamento (TAG)</Label>
                  <SearchableSelect
                    options={machinesInArea.map((m) => ({ value: m.nome, label: `${m.nome} - ${m.tipo}` }))}
                    value={formData.compressor}
                    onValueChange={(v) => setFormData({ ...formData, compressor: v })}
                    placeholder="Selecione o equipamento"
                    searchPlaceholder="Pesquisar equipamento..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="utilizacao">Utilização</Label>
                  <SearchableSelect
                    options={UTILIZACOES.map((u) => ({ value: u, label: u }))}
                    value={formData.utilizacao}
                    onValueChange={(v) => setFormData({ ...formData, utilizacao: v })}
                    placeholder="Selecione"
                    searchPlaceholder="Pesquisar..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacao">Observação</Label>
                <Input
                  id="observacao"
                  value={formData.observacao}
                  onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                  placeholder="Observações adicionais sobre a saída..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button type="submit">{editingSaida ? "Salvar Alterações" : "Registrar Saída"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Dialog de Busca por NF */}
      <Dialog open={nfDialogOpen} onOpenChange={setNfDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSearch className="h-5 w-5" />
              Itens da NF: {buscaNF}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {itensNF.length} item(ns) encontrado(s). Selecione os itens que deseja dar saída.
              </p>
              <Button variant="outline" size="sm" onClick={toggleTodos}>
                {itensSelecionados.size === itensNF.length ? "Desselecionar Todos" : "Selecionar Todos"}
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={itensSelecionados.size === itensNF.length && itensNF.length > 0}
                      onCheckedChange={toggleTodos}
                    />
                  </TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>OS</TableHead>
                  <TableHead>Nº Série</TableHead>
                  <TableHead>Origem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itensNF.map((item) => (
                  <TableRow 
                    key={item.id} 
                    className={itensSelecionados.has(item.id) ? "bg-primary/10" : ""}
                    onClick={() => toggleItemSelecionado(item.id)}
                  >
                    <TableCell>
                      <Checkbox
                        checked={itensSelecionados.has(item.id)}
                        onCheckedChange={() => toggleItemSelecionado(item.id)}
                      />
                    </TableCell>
                    <TableCell className="font-mono font-medium">{item.codigo}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{item.descricao}</TableCell>
                    <TableCell className="text-center">{item.quantidade}</TableCell>
                    <TableCell>{item.ordem_servico || "-"}</TableCell>
                    <TableCell>{item.numero_serie || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{item.origem}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-between items-center pt-4 border-t">
            <p className="text-sm font-medium">
              {itensSelecionados.size} item(ns) selecionado(s)
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setNfDialogOpen(false)}>Cancelar</Button>
              <Button onClick={usarItensSelecionados} disabled={itensSelecionados.size === 0}>
                Usar Selecionados
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Saída Múltipla */}
      <Dialog open={saidaMultiplaDialogOpen} onOpenChange={setSaidaMultiplaDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registrar Saída de {itensSelecionadosParaSaida.length} Itens</DialogTitle>
          </DialogHeader>
          <form onSubmit={processarSaidasMultiplas} className="space-y-4">
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm font-medium mb-2">Itens selecionados:</p>
              <div className="space-y-1 max-h-32 overflow-auto">
                {itensSelecionadosParaSaida.map((item) => (
                  <p key={item.id} className="text-xs text-muted-foreground">
                    • {item.codigo} - {item.descricao} (Qtd: {item.quantidade})
                  </p>
                ))}
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Preencha os dados comuns para todas as saídas:
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="multi_data_saida">Data</Label>
                <Input
                  id="multi_data_saida"
                  type="date"
                  value={formData.data_saida}
                  onChange={(e) => setFormData({ ...formData, data_saida: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="multi_ordem_servico">Ordem de Serviço (Padrão)</Label>
                <Input
                  id="multi_ordem_servico"
                  value={formData.ordem_servico}
                  onChange={(e) => setFormData({ ...formData, ordem_servico: e.target.value })}
                  placeholder="Usada se item não tiver OS"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="multi_area">Área *</Label>
                <SearchableSelect
                  options={areas.map((a) => ({ value: a, label: a }))}
                  value={formData.area}
                  onValueChange={(v) => setFormData({ ...formData, area: v, compressor: "" })}
                  placeholder="Selecione a área"
                  searchPlaceholder="Pesquisar área..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="multi_compressor">Equipamento (TAG) *</Label>
                <SearchableSelect
                  options={machinesInArea.map((m) => ({ value: m.nome, label: `${m.nome} - ${m.tipo}` }))}
                  value={formData.compressor}
                  onValueChange={(v) => setFormData({ ...formData, compressor: v })}
                  placeholder="Selecione o equipamento"
                  searchPlaceholder="Pesquisar equipamento..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="multi_utilizacao">Utilização *</Label>
                <SearchableSelect
                  options={UTILIZACOES.map((u) => ({ value: u, label: u }))}
                  value={formData.utilizacao}
                  onValueChange={(v) => setFormData({ ...formData, utilizacao: v })}
                  placeholder="Selecione"
                  searchPlaceholder="Pesquisar..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setSaidaMultiplaDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">Registrar {itensSelecionadosParaSaida.length} Saídas</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Saídas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredSaidas.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Itens Utilizados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredSaidas.reduce((acc, s) => acc + s.quantidade, 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Corretiva / Preventiva</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span className="text-amber-600">{filteredSaidas.filter((s) => s.utilizacao === "Corretiva").length}</span>
              {" / "}
              <span className="text-blue-600">{filteredSaidas.filter((s) => s.utilizacao === "Preventiva").length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <PackageMinus className="h-5 w-5" />
              Registro de Saídas
            </CardTitle>
            <Select value={utilizacaoFilter} onValueChange={setUtilizacaoFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por Utilização" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Utilizações</SelectItem>
                {utilizacoesUnicas.map((utilizacao) => (
                  <SelectItem key={utilizacao} value={utilizacao}>
                    {utilizacao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, descrição, OS, NF, equipamento, área..."
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
          ) : filteredSaidas.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Nenhuma saída registrada. Clique em &quot;Nova Saída&quot; para adicionar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedRows.size > 0 && sortedAndFilteredSaidas.every((s) => selectedRows.has(s.id))}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
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
                      <button onClick={() => handleSort("data_saida")} className="flex items-center font-medium hover:text-foreground cursor-pointer">
                        Data <SortIcon columnKey="data_saida" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => handleSort("ordem_servico")} className="flex items-center font-medium hover:text-foreground cursor-pointer">
                        Ordem Serviço <SortIcon columnKey="ordem_servico" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => handleSort("nota_fiscal")} className="flex items-center font-medium hover:text-foreground cursor-pointer">
                        NF <SortIcon columnKey="nota_fiscal" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => handleSort("area")} className="flex items-center font-medium hover:text-foreground cursor-pointer">
                        Área <SortIcon columnKey="area" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => handleSort("compressor")} className="flex items-center font-medium hover:text-foreground cursor-pointer">
                        Equipamento <SortIcon columnKey="compressor" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => handleSort("utilizacao")} className="flex items-center font-medium hover:text-foreground cursor-pointer">
                        Utilização <SortIcon columnKey="utilizacao" />
                      </button>
                    </TableHead>
                    <TableHead>Observação</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                    <TableHead className="w-[40px]">
                      <button
                        onClick={() => setShowUploadDate(!showUploadDate)}
                        className="p-1 hover:bg-muted rounded"
                        title={showUploadDate ? "Ocultar Data de Upload" : "Mostrar Data de Upload"}
                      >
                        {showUploadDate ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </TableHead>
                    {showUploadDate && (
                      <TableHead>Data Upload</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAndFilteredSaidas.map((saida) => (
                    <TableRow key={saida.id} className={selectedRows.has(saida.id) ? "bg-primary/10" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selectedRows.has(saida.id)}
                          onCheckedChange={() => toggleRowSelection(saida.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono font-medium">{saida.codigo}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{saida.descricao}</TableCell>
                      <TableCell className="text-center">{saida.quantidade}</TableCell>
                      <TableCell>
                        {saida.data_saida ? new Date(saida.data_saida).toLocaleDateString("pt-BR") : "-"}
                      </TableCell>
                      <TableCell>{saida.ordem_servico || "-"}</TableCell>
                      <TableCell>{saida.nota_fiscal || "-"}</TableCell>
                      <TableCell>{saida.area}</TableCell>
                      <TableCell className="font-medium">{saida.compressor}</TableCell>
                      <TableCell>
                        <Badge
                          variant={saida.utilizacao === "Corretiva" ? "destructive" : "default"}
                          className={saida.utilizacao === "Preventiva" ? "bg-blue-500 hover:bg-blue-600" : ""}
                        >
                          {saida.utilizacao}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate" title={saida.observacao || ""}>
                        {saida.observacao || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(saida)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(saida.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell></TableCell>
                      {showUploadDate && (
                        <TableCell className="text-sm text-muted-foreground">
                          {saida.created_at ? new Date(saida.created_at).toLocaleDateString("pt-BR") : "-"}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Edição em Massa */}
      <Dialog open={bulkEditDialogOpen} onOpenChange={setBulkEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar {selectedRows.size} Registros em Massa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Preencha apenas os campos que deseja alterar. Campos vazios não serão modificados.
            </p>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={bulkEditData.data_saida}
                  onChange={(e) => setBulkEditData({ ...bulkEditData, data_saida: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Ordem de Serviço</Label>
                <Input
                  value={bulkEditData.ordem_servico}
                  onChange={(e) => setBulkEditData({ ...bulkEditData, ordem_servico: e.target.value })}
                  placeholder="Ex: 408103074"
                />
              </div>
              <div className="space-y-2">
                <Label>Nota Fiscal</Label>
                <Input
                  value={bulkEditData.nota_fiscal}
                  onChange={(e) => setBulkEditData({ ...bulkEditData, nota_fiscal: e.target.value })}
                  placeholder="Ex: 276521-15"
                />
              </div>
              <div className="space-y-2">
                <Label>Utilização</Label>
                <SearchableSelect
                  options={[{ value: "", label: "Não alterar" }, ...UTILIZACOES.map((u) => ({ value: u, label: u }))]}
                  value={bulkEditData.utilizacao}
                  onValueChange={(v) => setBulkEditData({ ...bulkEditData, utilizacao: v })}
                  placeholder="Não alterar"
                  searchPlaceholder="Pesquisar..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Área</Label>
                <SearchableSelect
                  options={[{ value: "", label: "Não alterar" }, ...areas.map((a) => ({ value: a, label: a }))]}
                  value={bulkEditData.area}
                  onValueChange={(v) => setBulkEditData({ ...bulkEditData, area: v, compressor: "" })}
                  placeholder="Não alterar"
                  searchPlaceholder="Pesquisar área..."
                />
              </div>
              <div className="space-y-2">
                <Label>Equipamento (TAG)</Label>
                <SearchableSelect
                  options={[{ value: "", label: "Não alterar" }, ...bulkMachinesInArea.map((m) => ({ value: m.nome, label: `${m.nome} - ${m.tipo}` }))]}
                  value={bulkEditData.compressor}
                  onValueChange={(v) => setBulkEditData({ ...bulkEditData, compressor: v })}
                  placeholder="Não alterar"
                  searchPlaceholder="Pesquisar equipamento..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observação</Label>
              <Input
                value={bulkEditData.observacao}
                onChange={(e) => setBulkEditData({ ...bulkEditData, observacao: e.target.value })}
                placeholder="Nova observação para todos os selecionados..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setBulkEditDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleBulkEdit}>Salvar Alterações</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
