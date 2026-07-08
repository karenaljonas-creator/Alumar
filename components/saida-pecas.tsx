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
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Edit, Trash2, PackageMinus, Check, AlertCircle, FileSearch, Loader2, FilterX } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { formatDateOnly } from "@/lib/utils"
import { ColumnFilter } from "@/components/column-filter"
import { useTableFilters, type TableColumnDef } from "@/lib/use-table-filters"
import { HorizontalScrollArea } from "@/components/horizontal-scroll-area"

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
  updated_at?: string
  // Derivado: origem da entrada correspondente à NF (não é coluna da tabela saida_pecas)
  origem?: string
}

interface EstoquePeca {
  id: string
  codigo: string
  descricao: string
  quantidade: number
  nota_fiscal: string
}

interface ItensNF {
  id: string
  codigo: string
  descricao: string
  quantidade_disponivel: number
  quantidade_saida: number
  selecionado: boolean
}

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
  const [codigoEncontrado, setCodigoEncontrado] = useState<boolean | null>(null)
  const [salvando, setSalvando] = useState(false)
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

  const [buscaNF, setBuscaNF] = useState("")
  const [buscandoNF, setBuscandoNF] = useState(false)
  const [itensNF, setItensNF] = useState<ItensNF[]>([])
  const [nfCarregada, setNfCarregada] = useState(false)

  // Get unique areas from machines
  const areas = [...new Set(machines.map((m) => m.localizacao))].filter(Boolean).sort()

  const loadSaidas = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("saida_pecas")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      toast({ title: "Erro ao carregar saídas", description: error.message, variant: "destructive" })
    } else {
      const saidasData = data || []

      // Buscar a origem de cada NF a partir das entradas (estoque_pecas)
      const nfs = [...new Set(saidasData.map((s) => s.nota_fiscal).filter(Boolean))]
      const mapaOrigemPorNF = new Map<string, string>()
      if (nfs.length > 0) {
        const { data: entradas, error: erroEntradas } = await supabase
          .from("estoque_pecas")
          .select("nota_fiscal, origem")
          .in("nota_fiscal", nfs)
        if (erroEntradas) {
          console.error("Erro ao carregar origem das NFs:", erroEntradas)
        } else {
          for (const e of entradas || []) {
            if (e.nota_fiscal && e.origem && !mapaOrigemPorNF.has(e.nota_fiscal)) {
              mapaOrigemPorNF.set(e.nota_fiscal, e.origem)
            }
          }
        }
      }

      setSaidas(saidasData.map((s) => ({ ...s, origem: mapaOrigemPorNF.get(s.nota_fiscal) || "" })))
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

  // Calcula o saldo real em estoque de um código: total de entradas - total de saídas.
  // Quando ignoreSaidaId é informado (edição), aquela saída não é descontada.
  const calcularSaldo = async (codigo: string, ignoreSaidaId?: string): Promise<number> => {
    const { data: entradas } = await supabase
      .from("estoque_pecas")
      .select("quantidade")
      .eq("codigo", codigo)
    const totalEntrada = (entradas || []).reduce((acc, e) => acc + (e.quantidade || 0), 0)

    let querySaidas = supabase.from("saida_pecas").select("id, quantidade").eq("codigo", codigo)
    const { data: saidasItem } = await querySaidas
    const totalSaida = (saidasItem || [])
      .filter((s) => (ignoreSaidaId ? s.id !== ignoreSaidaId : true))
      .reduce((acc, s) => acc + (s.quantidade || 0), 0)

    return totalEntrada - totalSaida
  }

  // Verifica se já existe uma saída idêntica (NF + código + quantidade + data).
  const existeDuplicata = async (
    codigo: string,
    quantidade: number,
    data_saida: string,
    nota_fiscal: string,
    ignoreSaidaId?: string,
  ): Promise<boolean> => {
    let query = supabase
      .from("saida_pecas")
      .select("id")
      .eq("codigo", codigo)
      .eq("quantidade", quantidade)
      .eq("data_saida", data_saida)
      .eq("nota_fiscal", nota_fiscal || "")
    if (ignoreSaidaId) query = query.neq("id", ignoreSaidaId)
    const { data } = await query
    return (data || []).length > 0
  }

  // Buscar TODOS os itens por Nota Fiscal OU por Código (PN) da entrada
  const handleBuscarNF = async () => {
    const termo = buscaNF.trim()
    if (!termo) {
      toast({ title: "Digite a Nota Fiscal ou o Código do item", variant: "destructive" })
      return
    }

    setBuscandoNF(true)

    // Procura tanto na nota fiscal quanto no código da peça
    const { data, error } = await supabase
      .from("estoque_pecas")
      .select("*")
      .or(`nota_fiscal.ilike.%${termo}%,codigo.ilike.%${termo}%`)
      .order("codigo")

    if (error) {
      toast({ title: "Erro ao buscar", description: error.message, variant: "destructive" })
      setItensNF([])
      setNfCarregada(false)
    } else if (data && data.length > 0) {
      // Agrupar itens por código, somando quantidades
      const itensAgrupados = new Map<string, ItensNF>()
      
      data.forEach((item) => {
        const key = item.codigo
        if (itensAgrupados.has(key)) {
          const existing = itensAgrupados.get(key)!
          existing.quantidade_disponivel += item.quantidade || 0
        } else {
          itensAgrupados.set(key, {
            id: item.id,
            codigo: item.codigo,
            descricao: item.descricao,
            quantidade_disponivel: item.quantidade || 0,
            quantidade_saida: 0,
            selecionado: false,
          })
        }
      })

      const itens = Array.from(itensAgrupados.values())
      // Usa a Nota Fiscal real do item encontrado (importante quando a busca foi por código)
      const notaFiscalReal = data[0]?.nota_fiscal || buscaNF.trim()
      setItensNF(itens)
      setNfCarregada(true)
      setFormData((prev) => ({ ...prev, nota_fiscal: notaFiscalReal }))
      toast({ title: "Sucesso!", description: `${itens.length} item(ns) carregado(s)` })
    } else {
      toast({ title: "Nada encontrado", description: "Nenhum item com essa Nota Fiscal ou Código foi encontrado.", variant: "destructive" })
      setItensNF([])
      setNfCarregada(false)
    }
    setBuscandoNF(false)
  }

  // Atualizar quantidade de saída de um item
  const handleAtualizarQuantidade = (codigo: string, quantidade: number) => {
    setItensNF((prev) =>
      prev.map((item) =>
        item.codigo === codigo
          ? {
              ...item,
              quantidade_saida: Math.min(Math.max(0, quantidade), item.quantidade_disponivel),
            }
          : item
      )
    )
  }

  // Toggle seleção de item — ao marcar, já define uma quantidade padrão (1)
  // para que o item seja aceito na confirmação sem precisar digitar manualmente.
  const handleToggleSelecionado = (codigo: string) => {
    setItensNF((prev) =>
      prev.map((item) => {
        if (item.codigo !== codigo) return item
        const selecionado = !item.selecionado
        return {
          ...item,
          selecionado,
          quantidade_saida: selecionado
            ? item.quantidade_saida > 0
              ? item.quantidade_saida
              : Math.min(1, item.quantidade_disponivel)
            : 0,
        }
      })
    )
  }

  // Confirmar saída dos itens selecionados
  const handleConfirmarSaida = async () => {
    if (salvando) return // Regra 3: bloqueia duplo clique / múltiplas transações

    const selecionados = itensNF.filter((item) => item.selecionado)

    if (selecionados.length === 0) {
      toast({ title: "Selecione pelo menos um item", variant: "destructive" })
      return
    }

    const itensSelecionados = selecionados.filter((item) => item.quantidade_saida > 0)
    if (itensSelecionados.length === 0) {
      toast({
        title: "Informe a quantidade de saída",
        description: "Os itens marcados estão com quantidade 0. Ajuste a coluna \"Saída\".",
        variant: "destructive",
      })
      return
    }

    setSalvando(true)
    try {
      // Regra 2: validar saldo de estoque de cada item antes de gravar
      for (const item of itensSelecionados) {
        const saldo = await calcularSaldo(item.codigo)
        if (item.quantidade_saida > saldo) {
          toast({
            title: "Erro: quantidade maior que o saldo disponível",
            description: `Item ${item.codigo} — Saldo atual: ${saldo} | Solicitado: ${item.quantidade_saida} | Diferença: ${item.quantidade_saida - saldo}`,
            variant: "destructive",
          })
          setSalvando(false)
          return
        }
      }

      // Regra 1: bloqueio de duplicidade (NF + código + quantidade + data)
      const duplicados: string[] = []
      for (const item of itensSelecionados) {
        const dup = await existeDuplicata(item.codigo, item.quantidade_saida, formData.data_saida, formData.nota_fiscal)
        if (dup) duplicados.push(item.codigo)
      }
      if (duplicados.length > 0) {
        const confirmar = window.confirm(
          `Atenção: esta saída já foi registrada anteriormente. Verifique antes de continuar.\n\nItem(ns) duplicado(s): ${duplicados.join(", ")}\n\nDeseja confirmar mesmo assim?`,
        )
        if (!confirmar) {
          setSalvando(false)
          return
        }
      }

      // Insert em lote (mais confiável) com verificação real de erro do banco
      const registros = itensSelecionados.map((item) => ({
        codigo: item.codigo,
        descricao: item.descricao,
        quantidade: item.quantidade_saida,
        data_saida: formData.data_saida,
        ordem_servico: formData.ordem_servico,
        nota_fiscal: formData.nota_fiscal,
        area: formData.area,
        compressor: formData.compressor,
        utilizacao: formData.utilizacao,
        observacao: formData.observacao,
      }))

      const { error } = await supabase.from("saida_pecas").insert(registros)

      if (error) {
        toast({
          title: "Erro ao registrar saída",
          description: error.message,
          variant: "destructive",
        })
        setSalvando(false)
        return
      }

      toast({
        title: "Saída registrada com sucesso!",
        description: `${itensSelecionados.length} item(ns) retirado(s) do estoque`,
      })

      await loadSaidas()
      resetForm()
    } finally {
      setSalvando(false)
    }
  }
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

  const dataAtualizacaoISO = (s: SaidaPeca) => s.updated_at || s.created_at

  const colunas = useMemo<TableColumnDef<SaidaPeca>[]>(
    () => [
      { key: "codigo", value: (s) => s.codigo },
      { key: "descricao", value: (s) => s.descricao },
      { key: "quantidade", numeric: true, value: (s) => String(s.quantidade ?? 0) },
      {
        key: "data_saida",
        value: (s) => (s.data_saida ? formatDateOnly(s.data_saida) : "-"),
        sortValue: (s) => s.data_saida || "",
      },
      { key: "ordem_servico", value: (s) => s.ordem_servico || "-" },
      { key: "area", value: (s) => s.area },
      { key: "compressor", value: (s) => s.compressor },
      { key: "utilizacao", value: (s) => s.utilizacao },
      { key: "nota_fiscal", value: (s) => s.nota_fiscal || "-" },
      { key: "origem", value: (s) => s.origem || "-" },
      {
        key: "data_atualizacao",
        value: (s) =>
          new Date(dataAtualizacaoISO(s)).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }),
        sortValue: (s) => dataAtualizacaoISO(s),
      },
    ],
    [],
  )

  const searchPredicate = useCallback(
    (s: SaidaPeca, termo: string) =>
      s.codigo.toLowerCase().includes(termo) ||
      s.descricao.toLowerCase().includes(termo) ||
      s.ordem_servico.toLowerCase().includes(termo) ||
      s.compressor.toLowerCase().includes(termo) ||
      (s.nota_fiscal || "").toLowerCase().includes(termo) ||
      (s.origem || "").toLowerCase().includes(termo),
    [],
  )

  const {
    linhas: filteredSaidas,
    filtros,
    ordenacao,
    universoPorColuna,
    contagensPorColuna,
    setFiltroColuna,
    ordenarColuna,
    limparTudo,
    filtrosAtivos,
  } = useTableFilters<SaidaPeca>({
    rows: saidas,
    columns: colunas,
    storageKey: "saida-pecas-filtros-v1",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (salvando) return // Regra 3: bloqueia duplo clique

    setSalvando(true)
    try {
      // Regra 2: validar saldo (ignora a própria saída em edição)
      const saldo = await calcularSaldo(formData.codigo, editingSaida?.id)
      if (formData.quantidade > saldo) {
        toast({
          title: "Erro: quantidade maior que o saldo disponível",
          description: `Saldo atual: ${saldo} | Solicitado: ${formData.quantidade} | Diferença: ${formData.quantidade - saldo}`,
          variant: "destructive",
        })
        setSalvando(false)
        return
      }

      // Regra 1: bloqueio de duplicidade
      const dup = await existeDuplicata(
        formData.codigo,
        formData.quantidade,
        formData.data_saida,
        formData.nota_fiscal,
        editingSaida?.id,
      )
      if (dup) {
        const confirmar = window.confirm(
          "Atenção: esta saída já foi registrada anteriormente. Verifique antes de continuar.\n\nDeseja confirmar mesmo assim?",
        )
        if (!confirmar) {
          setSalvando(false)
          return
        }
      }

      if (editingSaida) {
        const { error } = await supabase
          .from("saida_pecas")
          .update(formData)
          .eq("id", editingSaida.id)

        if (error) {
          toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" })
        } else {
          toast({ title: "Saída atualizada com sucesso!" })
          await loadSaidas()
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
          await loadSaidas()
          resetForm()
        }
      }
    } finally {
      setSalvando(false)
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
    setBuscaNF(saida.nota_fiscal || "")
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
    setBuscaNF("")
    setItensNF([])
    setNfCarregada(false)
    setDialogOpen(false)
  }

  // Filter machines by selected area
  const machinesInArea = formData.area
    ? machines.filter((m) => m.localizacao === formData.area)
    : machines

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Saída de Peças</h2>
          <p className="text-sm text-muted-foreground">Registro de saída de peças do estoque</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setDialogOpen(true) }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Saída
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingSaida ? "Editar Saída de Peça" : "Registrar Saída de Peça"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Buscar itens por Nota Fiscal */}
              <div className="space-y-2 p-3 bg-muted/50 rounded-lg border">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <FileSearch className="h-4 w-4" />
                  Buscar itens por Nota Fiscal ou Código
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={buscaNF}
                    onChange={(e) => setBuscaNF(e.target.value)}
                    placeholder="Digite a NF ou o Código do item da Entrada"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleBuscarNF()
                      }
                    }}
                  />
                  <Button type="button" variant="secondary" onClick={handleBuscarNF} disabled={buscandoNF}>
                    {buscandoNF ? "Buscando..." : "Buscar"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Busque pela NF ou pelo Código (PN) da Entrada para carregar os itens automaticamente</p>
              </div>

              {/* Lista de itens da NF */}
              {nfCarregada && itensNF.length > 0 && (
                <div className="space-y-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Itens da NF ({itensNF.length})</Label>
                    <span className="text-xs text-muted-foreground">
                      Selecionados: {itensNF.filter((i) => i.selecionado).length}
                    </span>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="max-h-[400px] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            <th className="p-2 text-left font-medium w-8">
                              <input
                                type="checkbox"
                                checked={itensNF.length > 0 && itensNF.every((i) => i.selecionado)}
                                onChange={(e) =>
                                  setItensNF((prev) =>
                                    prev.map((item) => ({
                                      ...item,
                                      selecionado: e.target.checked,
                                      quantidade_saida: e.target.checked
                                        ? item.quantidade_saida > 0
                                          ? item.quantidade_saida
                                          : Math.min(1, item.quantidade_disponivel)
                                        : 0,
                                    }))
                                  )
                                }
                                className="w-4 h-4"
                              />
                            </th>
                            <th className="p-2 text-left font-medium">Código</th>
                            <th className="p-2 text-left font-medium">Descrição</th>
                            <th className="p-2 text-center font-medium">Disponível</th>
                            <th className="p-2 text-center font-medium">Saída</th>
                            <th className="p-2 text-center font-medium">Restante</th>
                          </tr>
                        </thead>
                        <tbody>
                          {itensNF.map((item) => (
                            <tr key={item.codigo} className="border-t hover:bg-muted/50">
                              <td className="p-2">
                                <input
                                  type="checkbox"
                                  checked={item.selecionado}
                                  onChange={() => handleToggleSelecionado(item.codigo)}
                                  className="w-4 h-4"
                                />
                              </td>
                              <td className="p-2 font-mono text-xs">{item.codigo}</td>
                              <td className="p-2 text-sm">{item.descricao}</td>
                              <td className="p-2 text-center font-medium">{item.quantidade_disponivel}</td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max={item.quantidade_disponivel}
                                  value={item.quantidade_saida}
                                  onChange={(e) =>
                                    handleAtualizarQuantidade(item.codigo, parseInt(e.target.value) || 0)
                                  }
                                  disabled={!item.selecionado}
                                  className="w-20 text-center h-8"
                                />
                              </td>
                              <td className="p-2 text-center text-sm">
                                {item.quantidade_disponivel - item.quantidade_saida}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Data e OS também no modo de busca por NF/Código */}
              {nfCarregada && itensNF.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="data_saida_nf">Data</Label>
                    <Input
                      id="data_saida_nf"
                      type="date"
                      value={formData.data_saida}
                      onChange={(e) => setFormData({ ...formData, data_saida: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ordem_servico_nf">OS</Label>
                    <Input
                      id="ordem_servico_nf"
                      value={formData.ordem_servico}
                      onChange={(e) => setFormData({ ...formData, ordem_servico: e.target.value })}
                      placeholder="Ordem de Serviço (opcional)"
                    />
                  </div>
                </div>
              )}

              {/* Mostrar campos manuais apenas quando NF não está carregada */}
              {!nfCarregada && (
                <>
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
                          className={codigoEncontrado === true ? "border-primary pr-10" : codigoEncontrado === false ? "border-muted-foreground pr-10" : ""}
                        />
                        {codigoEncontrado === true && (
                          <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                        )}
                        {codigoEncontrado === false && (
                          <AlertCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        )}
                      </div>
                      <datalist id="codigos-list">
                        {estoquePecas.map((p) => (
                          <option key={p.codigo} value={p.codigo}>{p.descricao}</option>
                        ))}
                      </datalist>
                      {codigoEncontrado === true && (
                        <p className="text-xs text-primary">Código encontrado no estoque!</p>
                      )}
                      {codigoEncontrado === false && (
                        <p className="text-xs text-muted-foreground">Código não encontrado no estoque. Você pode preencher a descrição manualmente.</p>
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
                  <Label htmlFor="ordem_servico">OS</Label>
                  <Input
                    id="ordem_servico"
                    value={formData.ordem_servico}
                    onChange={(e) => setFormData({ ...formData, ordem_servico: e.target.value })}
                    placeholder="Ordem de Serviço (opcional)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nota_fiscal">NF Saída</Label>
                  <Input
                    id="nota_fiscal"
                    value={formData.nota_fiscal}
                    onChange={(e) => setFormData({ ...formData, nota_fiscal: e.target.value })}
                    placeholder="Nota Fiscal (opcional)"
                  />
                </div>
              </div>
                </>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="area">Área</Label>
                  <Select value={formData.area} onValueChange={(v) => setFormData({ ...formData, area: v, compressor: "" })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a área" />
                    </SelectTrigger>
                    <SelectContent>
                      {areas.map((a) => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="compressor">Equipamento (TAG)</Label>
                  <Select value={formData.compressor} onValueChange={(v) => setFormData({ ...formData, compressor: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o equipamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {machinesInArea.map((m) => (
                        <SelectItem key={m.id} value={m.nome}>{m.nome} - {m.tipo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="utilizacao">Utilização</Label>
                  <Select value={formData.utilizacao} onValueChange={(v) => setFormData({ ...formData, utilizacao: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {UTILIZACOES.map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <Button type="button" variant="outline" onClick={resetForm} disabled={salvando}>Cancelar</Button>
                {nfCarregada ? (
                  <Button type="button" onClick={handleConfirmarSaida} disabled={salvando}>
                    {salvando ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Processando...</>
                    ) : (
                      "Confirmar Saída"
                    )}
                  </Button>
                ) : (
                  <Button type="submit" disabled={salvando}>
                    {salvando ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Processando...</>
                    ) : (
                      editingSaida ? "Salvar Alterações" : "Registrar Saída"
                    )}
                  </Button>
                )}
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
              <span className="text-muted-foreground">{filteredSaidas.filter((s) => s.utilizacao === "Corretiva").length}</span>
              {" / "}
              <span className="text-primary">{filteredSaidas.filter((s) => s.utilizacao === "Preventiva").length}</span>
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
            <div className="flex items-center gap-2">
              {(filtrosAtivos || searchTerm) && (
                <Button
                  onClick={() => {
                    limparTudo()
                    setSearchTerm("")
                  }}
                  variant="outline"
                  size="sm"
                  className="gap-1"
                >
                  <FilterX className="h-4 w-4" />
                  Limpar filtros
                </Button>
              )}
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código, descrição, OS, NF ou TAG..."
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
          ) : filteredSaidas.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Nenhuma saída registrada. Clique em &quot;Nova Saída&quot; para adicionar.
            </div>
          ) : (
            <HorizontalScrollArea>
              <Table className="w-full min-w-[1100px]">
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead>
                      <div className="flex items-center font-medium">Código {renderFiltro("codigo")}</div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center font-medium">Descrição {renderFiltro("descricao")}</div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center font-medium">Qtd {renderFiltro("quantidade", "center")}</div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center font-medium">Data {renderFiltro("data_saida")}</div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center font-medium">Ordem Serviço {renderFiltro("ordem_servico")}</div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center font-medium">Área {renderFiltro("area")}</div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center font-medium">Equipamento {renderFiltro("compressor")}</div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center font-medium">Utilização {renderFiltro("utilizacao")}</div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center font-medium">NF {renderFiltro("nota_fiscal")}</div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center font-medium">Origem {renderFiltro("origem")}</div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center font-medium">Atualizado em {renderFiltro("data_atualizacao")}</div>
                    </TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSaidas.map((saida) => (
                    <TableRow key={saida.id}>
                      <TableCell className="font-mono font-medium">{saida.codigo}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{saida.descricao}</TableCell>
                      <TableCell className="text-center">{saida.quantidade}</TableCell>
                      <TableCell>
                        {formatDateOnly(saida.data_saida)}
                      </TableCell>
                      <TableCell>{saida.ordem_servico || "-"}</TableCell>
                      <TableCell>{saida.area}</TableCell>
                      <TableCell className="font-medium">{saida.compressor}</TableCell>
                      <TableCell>
                        <Badge
                          variant={saida.utilizacao === "Corretiva" ? "destructive" : "default"}
                          className={saida.utilizacao === "Preventiva" ? "bg-primary hover:bg-primary" : ""}
                        >
                          {saida.utilizacao}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{saida.nota_fiscal || "-"}</TableCell>
                      <TableCell>
                        {saida.origem ? (
                          <Badge variant="outline" className="text-xs whitespace-nowrap">
                            {saida.origem}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {saida.updated_at ? new Date(saida.updated_at).toLocaleDateString("pt-BR", {day: "2-digit", month: "2-digit", year: "numeric"}) : new Date(saida.created_at).toLocaleDateString("pt-BR", {day: "2-digit", month: "2-digit", year: "numeric"})}
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </HorizontalScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
