"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Loader2,
  Edit2,
  ArrowUpDown,
  AlertTriangle,
  ChevronRight,
  FileText,
  FileSpreadsheet,
  Calendar as CalendarIcon,
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  getMachines,
  updateMachine,
  updateMachineCategoria,
  getParadasHistorico,
  createParadaHistorico,
  type ParadaHistorico,
} from "@/lib/supabase/data-service"
import type { Machine } from "@/lib/supabase/database.types"

const CATEGORIAS = [
  "Aguardando Peça",
  "Em execução",
  "Aguardando Cliente",
  "Aguardando Programação / Recurso",
  "Manutenção Corretiva",
  "Melhoria / Engenharia",
]

// Calcula dias entre uma data e hoje
function diffInDays(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const start = new Date(dateStr)
  const today = new Date()
  return Math.max(0, Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
}

// Cor da badge "Nesta Categoria" conforme dias
function categoriaDaysColor(days: number): string {
  if (days <= 15) return "bg-sky-100 text-sky-700"
  if (days <= 60) return "bg-amber-100 text-amber-700"
  return "bg-red-100 text-red-700"
}

export function Paradas() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [filterContrato, setFilterContrato] = useState<string>("all")
  const [filterAcao, setFilterAcao] = useState<string>("all")
  const [filterLocalizacao, setFilterLocalizacao] = useState<string>("all")

  // Expansão de linhas + histórico
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [historicos, setHistoricos] = useState<Record<string, ParadaHistorico[]>>({})
  const [loadingHistorico, setLoadingHistorico] = useState<Set<string>>(new Set())

  // Dialog de edição
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null)
  const [editForm, setEditForm] = useState({
    observacoes: "",
    prazo: "",
    acao_responsavel: "",
    responsavel: "",
  })

  // Sorting
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const machinesData = await getMachines()
      setMachines(machinesData)
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
    } finally {
      setLoading(false)
    }
  }

  const stoppedMachines = useMemo(() => {
    return machines.filter((m) => m.status === "parado")
  }, [machines])

  const uniqueAcoes = useMemo(() => {
    return [...new Set(stoppedMachines.map((m) => (m as any).acao_responsavel))]
      .filter(Boolean)
      .sort()
  }, [stoppedMachines])

  const uniqueLocalizacoes = useMemo(() => {
    return [...new Set(stoppedMachines.map((m) => m.area))].filter(Boolean).sort()
  }, [stoppedMachines])

  const filteredMachines = useMemo(() => {
    const filtered = stoppedMachines.filter((machine) => {
      const term = searchTerm.toLowerCase()
      const matchesSearch =
        term === "" ||
        machine.tag.toLowerCase().includes(term) ||
        machine.model.toLowerCase().includes(term) ||
        ((machine as any).responsavel || "").toLowerCase().includes(term)

      const matchesContrato =
        filterContrato === "all" ||
        (filterContrato === "sim" && machine.in_contract) ||
        (filterContrato === "nao" && !machine.in_contract)

      const matchesAcao =
        filterAcao === "all" || (machine as any).acao_responsavel === filterAcao

      const matchesLocalizacao =
        filterLocalizacao === "all" || machine.area === filterLocalizacao

      return matchesSearch && matchesContrato && matchesAcao && matchesLocalizacao
    })

    if (sortColumn) {
      filtered.sort((a, b) => {
        const aValue = (a as any)[sortColumn]?.toString().toLowerCase() || ""
        const bValue = (b as any)[sortColumn]?.toString().toLowerCase() || ""
        const compare = aValue.localeCompare(bValue)
        return sortDirection === "asc" ? compare : -compare
      })
    }

    return filtered
  }, [stoppedMachines, searchTerm, filterContrato, filterAcao, filterLocalizacao, sortColumn, sortDirection])

  const toggleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  async function toggleRow(machineId: string) {
    const next = new Set(expandedRows)
    if (next.has(machineId)) {
      next.delete(machineId)
      setExpandedRows(next)
      return
    }
    next.add(machineId)
    setExpandedRows(next)

    // Carrega histórico se ainda não carregou
    if (!historicos[machineId]) {
      const loadingNext = new Set(loadingHistorico)
      loadingNext.add(machineId)
      setLoadingHistorico(loadingNext)
      try {
        const hist = await getParadasHistorico(machineId)
        setHistoricos((prev) => ({ ...prev, [machineId]: hist }))
      } catch (error) {
        console.error("Erro ao carregar histórico:", error)
      } finally {
        const done = new Set(loadingHistorico)
        done.delete(machineId)
        setLoadingHistorico(done)
      }
    }
  }

  // Muda categoria inline
  async function handleCategoriaChange(machine: Machine, categoria: string) {
    try {
      await updateMachineCategoria(machine.id, categoria)
      // Registra no histórico
      await createParadaHistorico({
        machine_id: machine.id,
        tag: machine.tag,
        categoria,
        observacoes: (machine as any).observacoes || null,
        prazo: (machine as any).prazo || null,
        responsavel: (machine as any).responsavel || null,
        acao_responsavel: (machine as any).acao_responsavel || null,
        dias_parado: diffInDays((machine as any).data_parada),
      })
      // Limpa cache do histórico dessa máquina
      setHistoricos((prev) => {
        const next = { ...prev }
        delete next[machine.id]
        return next
      })
      if (expandedRows.has(machine.id)) {
        const hist = await getParadasHistorico(machine.id)
        setHistoricos((prev) => ({ ...prev, [machine.id]: hist }))
      }
      await loadData()
    } catch (error) {
      console.error("Erro ao mudar categoria:", error)
    }
  }

  // Muda prazo inline
  async function handlePrazoChange(machine: Machine, prazo: string) {
    try {
      await updateMachine(machine.id, { prazo: prazo || null } as any)
      await loadData()
    } catch (error) {
      console.error("Erro ao mudar prazo:", error)
    }
  }

  const openEditDialog = (machine: Machine) => {
    setSelectedMachine(machine)
    setEditForm({
      observacoes: (machine as any).observacoes || "",
      prazo: (machine as any).prazo || "",
      acao_responsavel: (machine as any).acao_responsavel || "",
      responsavel: (machine as any).responsavel || "",
    })
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedMachine) return
    setSaving(true)
    try {
      await updateMachine(selectedMachine.id, {
        responsavel: editForm.responsavel,
        acao_responsavel: editForm.acao_responsavel,
        prazo: editForm.prazo || null,
        observacoes: editForm.observacoes,
      } as any)
      // Registra no histórico
      await createParadaHistorico({
        machine_id: selectedMachine.id,
        tag: selectedMachine.tag,
        categoria: (selectedMachine as any).categoria || null,
        observacoes: editForm.observacoes || null,
        prazo: editForm.prazo || null,
        responsavel: editForm.responsavel || null,
        acao_responsavel: editForm.acao_responsavel || null,
        dias_parado: diffInDays((selectedMachine as any).data_parada),
      })
      setHistoricos((prev) => {
        const next = { ...prev }
        delete next[selectedMachine.id]
        return next
      })
      await loadData()
      setEditDialogOpen(false)
      setSelectedMachine(null)
    } catch (error) {
      console.error("Erro ao salvar:", error)
    } finally {
      setSaving(false)
    }
  }

  // ============ RELATÓRIOS ============
  function openReport(title: string, bodyHtml: string) {
    const win = window.open("", "_blank")
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          * { font-family: Arial, Helvetica, sans-serif; }
          body { margin: 32px; color: #111; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          .subtitle { color: #666; font-size: 13px; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f5f5f5; }
          .summary-card { display: inline-block; border: 1px solid #ddd; border-radius: 8px; padding: 16px 24px; margin-right: 16px; margin-bottom: 16px; }
          .summary-card .num { font-size: 28px; font-weight: bold; }
          .summary-card .lbl { color: #666; font-size: 12px; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="subtitle">Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</div>
        <button onclick="window.print()" style="padding:8px 16px;margin-bottom:16px;cursor:pointer;">Imprimir / Salvar PDF</button>
        ${bodyHtml}
      </body>
      </html>
    `)
    win.document.close()
  }

  function gerarRelatorioExecutivo() {
    // Resumo por categoria
    const porCategoria: Record<string, number> = {}
    stoppedMachines.forEach((m) => {
      const cat = (m as any).categoria || "Sem categoria"
      porCategoria[cat] = (porCategoria[cat] || 0) + 1
    })

    const cards = `
      <div class="summary-card"><div class="num">${stoppedMachines.length}</div><div class="lbl">Total de Paradas</div></div>
      <div class="summary-card"><div class="num">${stoppedMachines.filter((m) => m.in_contract).length}</div><div class="lbl">Em Contrato</div></div>
      <div class="summary-card"><div class="num">${stoppedMachines.filter((m) => !m.in_contract).length}</div><div class="lbl">Fora de Contrato</div></div>
    `

    const rows = Object.entries(porCategoria)
      .map(([cat, count]) => `<tr><td>${cat}</td><td>${count}</td></tr>`)
      .join("")

    const body = `
      <div>${cards}</div>
      <h3>Distribuição por Categoria</h3>
      <table>
        <thead><tr><th>Categoria</th><th>Equipamentos</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `
    openReport("Relatório Executivo - Máquinas Paradas", body)
  }

  function gerarRelatorioDetalhado() {
    const rows = filteredMachines
      .map((m) => {
        const dias = diffInDays((m as any).data_parada)
        const prazo = (m as any).prazo
          ? format(new Date((m as any).prazo), "dd/MM/yyyy", { locale: ptBR })
          : "-"
        return `<tr>
          <td>${m.tag}</td>
          <td>${m.model}</td>
          <td>${m.area}</td>
          <td>${(m as any).categoria || "-"}</td>
          <td>${dias !== null ? dias + " dias" : "-"}</td>
          <td>${(m as any).observacoes || "-"}</td>
          <td>${prazo}</td>
          <td>${(m as any).acao_responsavel || "-"}</td>
          <td>${(m as any).responsavel || "-"}</td>
        </tr>`
      })
      .join("")

    const body = `
      <table>
        <thead>
          <tr>
            <th>TAG</th><th>Modelo</th><th>Localização</th><th>Categoria</th>
            <th>Dias Parado</th><th>Observações</th><th>Prazo</th><th>Ação</th><th>Responsável</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `
    openReport("Relatório Detalhado - Máquinas Paradas", body)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const ultimaAtualizacao = machines
    .map((m) => m.updated_at)
    .filter(Boolean)
    .sort()
    .reverse()[0]

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gestão de Máquinas Paradas</h1>
        <p className="text-muted-foreground">
          Acompanhe todas as máquinas paradas com dados do último registro semanal
        </p>
      </div>

      {/* Card resumo */}
      <div className="bg-white rounded-lg border border-border p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-500 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Maquinas Paradas - {stoppedMachines.length} equipamentos
              </h2>
              <p className="text-sm text-muted-foreground">
                Dados do registro atual
                {ultimaAtualizacao
                  ? ` - Atualizado em ${format(new Date(ultimaAtualizacao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`
                  : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={gerarRelatorioExecutivo}>
              <FileText className="h-4 w-4 mr-2" />
              Relatório Executivo
            </Button>
            <Button
              size="sm"
              className="bg-slate-800 hover:bg-slate-900 text-white"
              onClick={gerarRelatorioDetalhado}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Relatório Detalhado
            </Button>
            <Badge variant="destructive" className="text-sm px-3 py-1.5">
              {stoppedMachines.length} paradas
            </Badge>
          </div>
        </div>
      </div>

      {/* Busca e filtros */}
      <div className="bg-white rounded-lg border border-border p-5">
        <div className="flex items-end gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por TAG, modelo ou responsavel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Contrato</span>
            <Select value={filterContrato} onValueChange={setFilterContrato}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="sim">Em Contrato</SelectItem>
                <SelectItem value="nao">Fora de Contrato</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Acao Responsavel</span>
            <Select value={filterAcao} onValueChange={setFilterAcao}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {uniqueAcoes.map((acao) => (
                  <SelectItem key={acao} value={acao as string}>
                    {acao as string}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Localizacao</span>
            <Select value={filterLocalizacao} onValueChange={setFilterLocalizacao}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {uniqueLocalizacoes.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Dica */}
      <p className="text-xs text-muted-foreground">
        Clique na seta &rsaquo; (ou no TAG) para expandir o histórico completo da parada logo
        abaixo da linha.
      </p>

      {/* Tabela */}
      <div className="bg-white rounded-lg border border-border overflow-hidden">
        {filteredMachines.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {stoppedMachines.length === 0
              ? "Nenhum equipamento parado no momento."
              : "Nenhum equipamento encontrado com os filtros aplicados."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-transparent">
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("tag")}>
                    <div className="flex items-center gap-1">
                      TAG
                      <ArrowUpDown className={`h-3 w-3 ${sortColumn === "tag" ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("model")}>
                    <div className="flex items-center gap-1">
                      Modelo
                      <ArrowUpDown className={`h-3 w-3 ${sortColumn === "model" ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("area")}>
                    <div className="flex items-center gap-1">
                      Localizacao
                      <ArrowUpDown className={`h-3 w-3 ${sortColumn === "area" ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Dias Parado</TableHead>
                  <TableHead>Nesta Categoria</TableHead>
                  <TableHead className="min-w-[240px]">Observacoes</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Acao</TableHead>
                  <TableHead>Responsavel</TableHead>
                  <TableHead>Atualizado em</TableHead>
                  <TableHead className="text-right">Editar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMachines.map((machine) => {
                  const diasParado = diffInDays((machine as any).data_parada)
                  const diasCategoria = diffInDays((machine as any).categoria_updated_at)
                  const isExpanded = expandedRows.has(machine.id)
                  const hist = historicos[machine.id] || []
                  const isLoadingHist = loadingHistorico.has(machine.id)

                  return (
                    <>
                      <TableRow key={machine.id} className="border-b border-border/50 hover:bg-muted/20">
                        <TableCell className="py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => toggleRow(machine.id)}
                          >
                            <ChevronRight
                              className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                            />
                          </Button>
                        </TableCell>
                        <TableCell
                          className="font-medium text-primary cursor-pointer py-3"
                          onClick={() => toggleRow(machine.id)}
                        >
                          {machine.tag}
                        </TableCell>
                        <TableCell className="py-3">{machine.model}</TableCell>
                        <TableCell className="py-3">{machine.area}</TableCell>
                        <TableCell className="py-3">
                          <Badge variant="destructive">Parada</Badge>
                        </TableCell>
                        <TableCell className="py-3">
                          <Select
                            value={(machine as any).categoria || ""}
                            onValueChange={(v) => handleCategoriaChange(machine, v)}
                          >
                            <SelectTrigger className="w-[200px] h-9">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIAS.map((cat) => (
                                <SelectItem key={cat} value={cat}>
                                  {cat}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="py-3 whitespace-nowrap">
                          {diasParado !== null ? (
                            <span className={diasParado > 30 ? "text-red-600 font-medium" : ""}>
                              {diasParado} dias
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="py-3">
                          {diasCategoria !== null ? (
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${categoriaDaysColor(diasCategoria)}`}
                            >
                              {diasCategoria} dias
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="py-3 max-w-[280px]">
                          <span className="text-sm text-foreground line-clamp-2">
                            {(machine as any).observacoes || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="relative">
                            <CalendarIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                            <Input
                              type="date"
                              value={(machine as any).prazo || ""}
                              onChange={(e) => handlePrazoChange(machine, e.target.value)}
                              className="h-9 w-[150px] pl-7 text-sm"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="py-3">{(machine as any).acao_responsavel || "-"}</TableCell>
                        <TableCell className="py-3">{(machine as any).responsavel || "-"}</TableCell>
                        <TableCell className="py-3 whitespace-nowrap text-sm text-muted-foreground">
                          {machine.updated_at
                            ? format(new Date(machine.updated_at), "dd/MM/yyyy", { locale: ptBR })
                            : "-"}
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => openEditDialog(machine)}
                          >
                            <Edit2 className="h-4 w-4 text-primary" />
                          </Button>
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow key={`${machine.id}-details`} className="hover:bg-transparent">
                          <TableCell colSpan={14} className="bg-muted/30 p-4">
                            <div className="rounded border border-border bg-white p-4">
                              <h4 className="font-semibold text-sm mb-3">
                                Histórico da parada - {machine.tag}
                              </h4>
                              {isLoadingHist ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Carregando histórico...
                                </div>
                              ) : hist.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-4">
                                  Nenhum registro de histórico ainda. As alterações de categoria,
                                  observações e prazo aparecerão aqui.
                                </p>
                              ) : (
                                <div className="space-y-3">
                                  {hist.map((h) => (
                                    <div
                                      key={h.id}
                                      className="flex gap-3 border-l-2 border-primary/40 pl-3 py-1"
                                    >
                                      <div className="text-xs text-muted-foreground whitespace-nowrap min-w-[120px]">
                                        {format(new Date(h.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                      </div>
                                      <div className="flex-1 text-sm">
                                        {h.categoria && (
                                          <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium mr-2">
                                            {h.categoria}
                                          </span>
                                        )}
                                        {h.observacoes && <p className="text-foreground mt-1">{h.observacoes}</p>}
                                        <div className="text-xs text-muted-foreground mt-1 flex gap-3 flex-wrap">
                                          {h.responsavel && <span>Resp.: {h.responsavel}</span>}
                                          {h.acao_responsavel && <span>Ação: {h.acao_responsavel}</span>}
                                          {h.prazo && (
                                            <span>
                                              Prazo: {format(new Date(h.prazo), "dd/MM/yyyy", { locale: ptBR })}
                                            </span>
                                          )}
                                          {h.dias_parado !== null && <span>{h.dias_parado} dias parado</span>}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Dialog de Edição */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Informações - {selectedMachine?.tag}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="acao_responsavel">Ação Responsável</Label>
              <Input
                id="acao_responsavel"
                value={editForm.acao_responsavel}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, acao_responsavel: e.target.value }))
                }
                placeholder="Ex: Vale, Atlas..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsavel">Responsável</Label>
              <Input
                id="responsavel"
                value={editForm.responsavel}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, responsavel: e.target.value }))
                }
                placeholder="Nome do responsável"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prazo">Prazo</Label>
              <Input
                id="prazo"
                type="date"
                value={editForm.prazo}
                onChange={(e) => setEditForm((prev) => ({ ...prev, prazo: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={editForm.observacoes}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, observacoes: e.target.value }))
                }
                placeholder="Justificativa ou observações adicionais..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
