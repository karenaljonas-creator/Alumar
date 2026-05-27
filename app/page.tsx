"use client"

// Sistema de Gestão de Máquinas - v1.0
import { useState, useEffect, useMemo } from "react"
import type { Machine, WeeklySnapshot } from "@/lib/types"
import { loadMachines, saveMachines, downloadCSV, importFromCSV } from "@/lib/supabase-machine-storage"
import { loadContrato } from "@/lib/contrato-storage"
import { saveWeeklySnapshot, loadHistory, deleteSnapshot, getHistoryTrends } from "@/lib/supabase-history-storage"
import {
  calculateStats,
  analisarPeriodoInoperante,
  analisarPorTipo,
  analisarPorLocalizacao,
  analisarAcaoResponsavel,
  analisarPreventivas,
  filtrarMaquinasPrincipais,
} from "@/lib/machine-utils"
import { StatusChart } from "@/components/status-chart"
import { MachineFilters } from "@/components/machine-filters"
import { MachineTable } from "@/components/machine-table"
import { MachineFormDialog } from "@/components/machine-form-dialog"
import { RegistroSemanal } from "@/components/registro-semanal"
import { Configuracoes } from "@/components/configuracoes"
import { Button } from "@/components/ui/button"
import { Plus, Download, Upload, Settings, ClipboardList, TrendingUp, LayoutDashboard, ChevronDown, ChevronRight, OctagonX, PackagePlus, PackageMinus, Boxes, Wrench, Shield } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { HistoricoMaquinas } from "@/components/historico-maquinas"
import { ImportHistoricalButton } from "@/components/import-historical-button"
import { GraficoPeriodoInoperante } from "@/components/grafico-periodo-inoperante"
import { GraficoTipoEquipamento } from "@/components/grafico-tipo-equipamento"
import { GraficoIndisponibilidadeSemanal } from "@/components/grafico-indisponibilidade-semanal"
import { GraficoLocalizacao } from "@/components/grafico-localizacao"
import { StatsCards } from "@/components/stats-cards"
import { GraficoDisponibilidadeSemanal } from "@/components/grafico-disponibilidade-semanal"
import { PreventivasChart } from "@/components/preventivas-chart"
import { GestaoParadas } from "@/components/gestao-paradas"
import { EntradaPecas } from "@/components/entrada-pecas"
import { SaidaPecas } from "@/components/saida-pecas"
import { EstoqueSaldo } from "@/components/estoque-saldo"
import { EstoqueEstrategico } from "@/components/estoque-estrategico"
import { cn } from "@/lib/utils"

type MenuSection = "painel" | "registro" | "historico" | "paradas" | "entrada" | "saida" | "estoque" | "estoque-estrategico" | "gerenciar" | "config"

export default function Home() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [history, setHistory] = useState<WeeklySnapshot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [tipoFilter, setTipoFilter] = useState("todos")
  const [localizacaoFilter, setLocalizacaoFilter] = useState("todos")
  const [contratoFilter, setContratoFilter] = useState("todos")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingMachine, setEditingMachine] = useState<Machine | undefined>()
  const [latestSnapshot, setLatestSnapshot] = useState<WeeklySnapshot | null>(null)
  const [activeSection, setActiveSection] = useState<MenuSection>("painel")
  const [materiaisExpanded, setMateriaisExpanded] = useState(false)
  const { toast } = useToast()
  const contrato = loadContrato()

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)

        const history = await loadHistory()

        if (history.length > 0) {
          const sorted = history.sort((a, b) => new Date(b.dataRegistro).getTime() - new Date(a.dataRegistro).getTime())
          const latest = sorted[0]
          setLatestSnapshot(latest)
        }

        const [savedMachines] = await Promise.all([loadMachines()])

        setMachines(savedMachines)
        setHistory(history)
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
        toast({
          title: "Erro ao carregar dados",
          description: error instanceof Error ? error.message : "Erro desconhecido",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [toast])

  const filteredMachines = useMemo(() => {
    return machines.filter((machine) => {
      const matchesSearch =
        machine.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        machine.tipo.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === "todos" || machine.status === statusFilter
      const matchesTipo = tipoFilter === "todos" || machine.tipo === tipoFilter
      const matchesLocalizacao = localizacaoFilter === "todos" || machine.localizacao === localizacaoFilter
      const matchesContrato =
        contratoFilter === "todos" ||
        (contratoFilter === "com-contrato" && machine.temContrato) ||
        (contratoFilter === "sem-contrato" && !machine.temContrato)

      return matchesSearch && matchesStatus && matchesTipo && matchesLocalizacao && matchesContrato
    })
  }, [machines, searchTerm, statusFilter, tipoFilter, localizacaoFilter, contratoFilter])

  const dashboardFilteredMachines = useMemo(() => {
    if (!latestSnapshot || !latestSnapshot.machines || latestSnapshot.machines.length === 0) {
      return []
    }

    let filtered = latestSnapshot.machines
    if (contratoFilter === "com-contrato") filtered = filtered.filter((m) => m.temContrato === true)
    if (contratoFilter === "sem-contrato") filtered = filtered.filter((m) => m.temContrato === false)
    return filtrarMaquinasPrincipais(filtered)
  }, [latestSnapshot, contratoFilter])

  const stats = useMemo(() => {
    return calculateStats(dashboardFilteredMachines)
  }, [dashboardFilteredMachines])

  const maquinasParadasFiltradas = useMemo(() => {
    let filtered = machines.filter((m) => m.status === "parada")
    if (contratoFilter === "com-contrato") filtered = filtered.filter((m) => m.temContrato === true)
    if (contratoFilter === "sem-contrato") filtered = filtered.filter((m) => m.temContrato === false)
    return filtered
  }, [machines, contratoFilter])

  const porTipo = useMemo(() => analisarPorTipo(maquinasParadasFiltradas), [maquinasParadasFiltradas])
  const porLocalizacao = useMemo(() => analisarPorLocalizacao(maquinasParadasFiltradas), [maquinasParadasFiltradas])
  const preventivas = useMemo(() => analisarPreventivas(dashboardFilteredMachines), [dashboardFilteredMachines])

  const tipos = useMemo(() => {
    return Array.from(new Set(machines.map((m) => m.tipo))).sort()
  }, [machines])

  const localizacoes = useMemo(() => {
    return Array.from(new Set(machines.map((m) => m.localizacao))).sort()
  }, [machines])

  const machinesForChart = useMemo(() => {
    if (!latestSnapshot || !latestSnapshot.machines || latestSnapshot.machines.length === 0) {
      return []
    }

    let filtered = latestSnapshot.machines
    if (contratoFilter === "com-contrato") filtered = filtered.filter((m) => m.temContrato === true)
    if (contratoFilter === "sem-contrato") filtered = filtered.filter((m) => m.temContrato === false)
    return filtered
  }, [latestSnapshot, contratoFilter])

  const handleSave = async (machineData: Omit<Machine, "id"> & { id?: string }) => {
    let updatedMachines: Machine[]

    if (machineData.id) {
      updatedMachines = machines.map((m) => (m.id === machineData.id ? (machineData as Machine) : m))
      toast({
        title: "Máquina atualizada",
        description: "As alterações foram salvas com sucesso.",
      })
    } else {
      const newMachine: Machine = {
        ...machineData,
        id: Date.now().toString(),
      }
      updatedMachines = [...machines, newMachine]
      toast({
        title: "Máquina adicionada",
        description: "A nova máquina foi cadastrada com sucesso.",
      })
    }

    try {
      await saveMachines(updatedMachines)
      setMachines(updatedMachines)
      setEditingMachine(undefined)
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta máquina?")) {
      const updatedMachines = machines.filter((m) => m.id !== id)

      try {
        await saveMachines(updatedMachines)
        setMachines(updatedMachines)

        toast({
          title: "Máquina excluída",
          description: "A máquina foi removida com sucesso.",
        })
      } catch (error) {
        toast({
          title: "Erro ao excluir",
          description: "Não foi possível excluir a máquina. Tente novamente.",
          variant: "destructive",
        })
      }
    }
  }

  const handleExport = async () => {
    // Exportar baseado na seção ativa
    if (activeSection === "entrada" || activeSection === "saida" || activeSection === "estoque") {
      // Exportar dados de peças (entrada ou saída)
      const supabase = (await import("@/lib/supabase/client")).createClient()
      const tableName = activeSection === "saida" ? "saida_pecas" : "estoque_pecas"
      const fileName = activeSection === "entrada" ? "entrada-pecas" : activeSection === "saida" ? "saida-pecas" : "estoque"
      
      const { data, error } = await supabase.from(tableName).select("*").order("created_at", { ascending: false })
      
      if (error) {
        toast({ title: "Erro ao exportar", description: error.message, variant: "destructive" })
        return
      }
      
      if (!data || data.length === 0) {
        toast({ title: "Nenhum dado", description: "Não há dados para exportar.", variant: "destructive" })
        return
      }
      
      // Criar CSV
      const headers = Object.keys(data[0]).join(",")
      const rows = data.map(row => Object.values(row).map(v => `"${v ?? ""}"`).join(","))
      const csv = [headers, ...rows].join("\n")
      
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `${fileName}-${new Date().toISOString().split("T")[0]}.csv`
      link.click()
      
      toast({ title: "Exportação concluída", description: `Dados de ${activeSection} exportados com sucesso.` })
    } else {
      // Exportar máquinas (comportamento padrão)
      downloadCSV(machines)
      toast({
        title: "Exportação concluída",
        description: "O arquivo CSV de máquinas foi baixado com sucesso.",
      })
    }
  }

  const handleImport = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".csv,.xlsx,.xls"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls")
      
      // Importar baseado na seção ativa
      if (activeSection === "entrada" || activeSection === "saida" || activeSection === "estoque") {
        try {
          const supabase = (await import("@/lib/supabase/client")).createClient()
          const tableName = activeSection === "saida" ? "saida_pecas" : "estoque_pecas"
          
          let rows: Record<string, string | number>[] = []
          
          if (isExcel) {
            // Importar Excel usando xlsx
            const XLSX = await import("xlsx")
            const data = await file.arrayBuffer()
            const workbook = XLSX.read(data, { type: "array" })
            const sheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[sheetName]
            const jsonData = XLSX.utils.sheet_to_json<Record<string, string | number>>(worksheet)
            
            // Mapear colunas do Excel para colunas do banco
            const columnMapping: Record<string, string> = {
              "Código": "codigo",
              "codigo": "codigo",
              "Descrição": "descricao",
              "descricao": "descricao",
              "QTD": "quantidade",
              "quantidade": "quantidade",
              "Pedido / O.S": "ordem_servico",
              "ordem_servico": "ordem_servico",
              "SERIE": "numero_serie",
              "numero_serie": "numero_serie",
              "NF": "nota_fiscal",
              "nota_fiscal": "nota_fiscal",
              "Data envio": "data_emissao",
              "data_emissao": "data_emissao",
              "Valor": "valor_unitario",
              "valor_unitario": "valor_unitario",
              "Valor total": "valor_total",
              "valor_total": "valor_total",
              "Origem": "origem",
              "origem": "origem",
              "obs": "observacao",
              "observacao": "observacao",
            }
            
            // Campos válidos da tabela estoque_pecas
            const validFields = ["codigo", "descricao", "quantidade", "ordem_servico", "numero_serie", "nota_fiscal", "data_emissao", "valor_unitario", "valor_total", "origem", "observacao"]
            
            rows = jsonData.map(row => {
              const mappedRow: Record<string, string | number | null> = {}
              Object.entries(row).forEach(([key, value]) => {
                const mappedKey = columnMapping[key] || key.toLowerCase().replace(/\s+/g, "_")
                
                // Só incluir campos válidos
                if (!validFields.includes(mappedKey)) return
                
                // Converter valores monetários (R$ 40.530,04 -> 40530.04)
                if (typeof value === "string" && value.includes("R$")) {
                  const numStr = value.replace("R$", "").replace(/\./g, "").replace(",", ".").trim()
                  mappedRow[mappedKey] = parseFloat(numStr) || 0
                } else if (mappedKey === "valor_unitario" || mappedKey === "valor_total") {
                  mappedRow[mappedKey] = typeof value === "number" ? value : parseFloat(String(value).replace(/\./g, "").replace(",", ".")) || 0
                } else if (mappedKey === "quantidade") {
                  mappedRow[mappedKey] = typeof value === "number" ? Math.floor(value) : parseInt(String(value)) || 1
                } else if (mappedKey === "data_emissao") {
                  // Converter data do Excel para formato ISO
                  if (typeof value === "number") {
                    // Excel serial date
                    const excelEpoch = new Date(1899, 11, 30)
                    const date = new Date(excelEpoch.getTime() + value * 86400000)
                    mappedRow["data_emissao"] = date.toISOString().split("T")[0]
                  } else if (typeof value === "string" && value) {
                    // DD/MM/YYYY format
                    const parts = value.split("/")
                    if (parts.length === 3) {
                      mappedRow["data_emissao"] = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`
                    } else {
                      mappedRow["data_emissao"] = null
                    }
                  } else {
                    mappedRow["data_emissao"] = null
                  }
                } else {
                  mappedRow[mappedKey] = String(value ?? "")
                }
              })
              
              // Garantir campos obrigatórios
              if (!mappedRow.codigo) return null
              
              // Converter codigo para string
              mappedRow.codigo = String(mappedRow.codigo)
              
              // Calcular valor_total se não existir
              if (!mappedRow.valor_total && mappedRow.valor_unitario && mappedRow.quantidade) {
                mappedRow.valor_total = Number(mappedRow.valor_unitario) * Number(mappedRow.quantidade)
              }
              
              return mappedRow
            }).filter(Boolean) as Record<string, string | number | null>[]
          } else {
            // Importar CSV
            const reader = new FileReader()
            const csvContent = await new Promise<string>((resolve) => {
              reader.onload = (event) => resolve(event.target?.result as string)
              reader.readAsText(file)
            })
            
            const lines = csvContent.split("\n").filter(line => line.trim())
            const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim())
            
            rows = lines.slice(1).map(line => {
              const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/"/g, "").trim()) || []
              const obj: Record<string, string> = {}
              headers.forEach((h, i) => {
                if (h !== "id" && h !== "created_at") {
                  obj[h] = values[i] || ""
                }
              })
              return obj
            }).filter(row => Object.keys(row).length > 0)
          }
          
          if (rows.length > 0) {
            console.log("[v0] Inserting rows:", rows.length, "into table:", tableName)
            console.log("[v0] First row sample:", rows[0])
            const { error } = await supabase.from(tableName).insert(rows)
            if (error) {
              console.error("[v0] Supabase error:", error)
              throw error
            }
            
            toast({
              title: "Importação concluída",
              description: `${rows.length} registros importados para ${activeSection}.`,
            })
            window.location.reload()
          } else {
            toast({
              title: "Nenhum dado",
              description: "Nenhum registro válido encontrado no arquivo.",
              variant: "destructive",
            })
          }
        } catch (error: unknown) {
          console.error("[v0] Erro na importação:", error)
          let errorMsg = "Não foi possível importar os dados."
          if (error && typeof error === "object") {
            const err = error as { message?: string; details?: string; hint?: string }
            errorMsg = err.message || err.details || err.hint || errorMsg
          }
          toast({
            title: "Erro na importação",
            description: errorMsg,
            variant: "destructive",
          })
        }
      } else {
        // Importar máquinas (comportamento padrão - apenas CSV)
        const reader = new FileReader()
        reader.onload = async (event) => {
          const csvContent = event.target?.result as string
          try {
            const importedMachines = await importFromCSV(csvContent)
            if (importedMachines.length > 0) {
              setMachines(importedMachines)
              toast({
                title: "Importação concluída",
                description: `${importedMachines.length} máquinas foram importadas com sucesso.`,
              })
            } else {
              toast({
                title: "Erro na importação",
                description: "Não foi possível importar os dados do arquivo.",
                variant: "destructive",
              })
            }
          } catch (error) {
            toast({
              title: "Erro na importação",
              description: "Não foi possível importar os dados do arquivo.",
              variant: "destructive",
            })
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  const handleSaveRegistroSemanal = async (updatedMachines: Machine[]) => {
    try {
      await saveMachines(updatedMachines)
      setMachines(updatedMachines)
      const updatedHistory = await loadHistory()
      setHistory(updatedHistory)

      toast({
        title: "Registro atualizado",
        description: "As alterações foram salvas com sucesso.",
      })
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  const handleAddNew = () => {
    setEditingMachine(undefined)
    setIsFormOpen(true)
  }

  const handleEdit = (machine: Machine) => {
    setEditingMachine(machine)
    setIsFormOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    )
  }

  const menuItems = [
    { id: "painel" as const, label: "Painel de Controle", icon: LayoutDashboard },
    { id: "registro" as const, label: "Registro Semanal", icon: ClipboardList },
    { id: "historico" as const, label: "Histórico", icon: TrendingUp },
    { id: "paradas" as const, label: "Paradas", icon: OctagonX },
  ]

  const materiaisItems = [
    { id: "entrada" as const, label: "Entrada", icon: PackagePlus },
    { id: "saida" as const, label: "Saída", icon: PackageMinus },
    { id: "estoque" as const, label: "Estoque", icon: Boxes },
    { id: "estoque-estrategico" as const, label: "Estoque Estratégico", icon: Shield },
  ]

  const configItems = [
    { id: "gerenciar" as const, label: "Gerenciar Máquinas", icon: Wrench },
    { id: "config" as const, label: "Configurações", icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col fixed h-screen">
        {/* Logo/Header */}
        <div className="p-4 border-b border-border">
          <h1 className="text-lg font-bold text-foreground">Gestão de Máquinas</h1>
          <div className="mt-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-blue-700 font-medium">
              {contrato.numero}
            </span>
            <span className="mx-1">|</span>
            <span className="text-green-700">{contrato.localizacao}</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          {/* Main Menu Items */}
          <div className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  activeSection === item.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </div>

          {/* Gestão de Materiais Section */}
          <div className="mt-6">
            <button
              onClick={() => setMateriaisExpanded(!materiaisExpanded)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            >
              <span>Gestão de Materiais</span>
              {materiaisExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            {materiaisExpanded && (
              <div className="mt-1 space-y-1 pl-2">
                {materiaisItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      activeSection === item.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="my-6 border-t border-border" />

          {/* Config Items */}
          <div className="space-y-1">
            {configItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  activeSection === item.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2 text-center">
            {activeSection === "entrada" ? "Entrada de Peças" : 
             activeSection === "saida" ? "Saída de Peças" :
             activeSection === "estoque" ? "Estoque" : 
  activeSection === "estoque-estrategico" ? "Estoque Estratégico" : "Máquinas"}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleImport} className="flex-1 text-xs">
              <Upload className="h-3 w-3 mr-1" />
              Importar
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} className="flex-1 text-xs">
              <Download className="h-3 w-3 mr-1" />
              Exportar
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        <div className="p-6">
          {/* Painel de Controle */}
          {activeSection === "painel" && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">Painel de Controle</h2>
                  <p className="text-sm text-muted-foreground">
                    {new Date()
                      .toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
                      .replace(".", "")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    * KPIs calculados apenas com Compressores, Secadores e Sopradores
                  </p>
                </div>
                <div className="flex gap-3 items-center">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="contratoFilter" className="text-sm font-medium whitespace-nowrap">
                      Filtrar por:
                    </Label>
                    <Select value={contratoFilter} onValueChange={setContratoFilter}>
                      <SelectTrigger id="contratoFilter" className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todas as Máquinas</SelectItem>
                        <SelectItem value="com-contrato">Com Contrato</SelectItem>
                        <SelectItem value="sem-contrato">Sem Contrato</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <StatsCards stats={stats} />

              <div className="grid gap-6 md:grid-cols-3">
                <StatusChart stats={stats} machines={machinesForChart} contratoFilter={contratoFilter} />
                <GraficoDisponibilidadeSemanal contratoFilter={contratoFilter} />
                <PreventivasChart preventivas={preventivas} />
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold">Análise de Máquinas Paradas</h3>
                  <p className="text-sm text-muted-foreground">Visualização detalhada das máquinas inoperantes</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <GraficoIndisponibilidadeSemanal contratoFilter={contratoFilter} />
                  <GraficoPeriodoInoperante machines={maquinasParadasFiltradas} />
                  <GraficoTipoEquipamento data={porTipo} />
                  <GraficoLocalizacao data={porLocalizacao} />
                </div>
              </div>
            </div>
          )}

          {/* Registro Semanal */}
          {activeSection === "registro" && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-semibold">Registro Semanal</h2>
                <p className="text-sm text-muted-foreground">
                  Preencha os dados de todas as máquinas semanalmente - Formato planilha
                </p>
              </div>
              <RegistroSemanal machines={machines} onSaveAll={handleSaveRegistroSemanal} />
            </div>
          )}

          {/* Histórico */}
          {activeSection === "historico" && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">Histórico de Máquinas</h2>
                  <p className="text-sm text-muted-foreground">
                    Visualize a evolução completa semana a semana de todas as máquinas
                  </p>
                </div>
                <ImportHistoricalButton />
              </div>
              <HistoricoMaquinas machines={machines} />
            </div>
          )}

          {/* Paradas */}
          {activeSection === "paradas" && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-semibold">Gestão de Máquinas Paradas</h2>
                <p className="text-sm text-muted-foreground">
                  Acompanhe todas as máquinas paradas com dados do último registro semanal
                </p>
              </div>
              <GestaoParadas machines={machines} />
            </div>
          )}

          {/* Entrada */}
          {activeSection === "entrada" && (
            <div className="space-y-8">
              <EntradaPecas />
            </div>
          )}

          {/* Saída */}
          {activeSection === "saida" && (
            <div className="space-y-8">
              <SaidaPecas machines={machines} />
            </div>
          )}

          {/* Estoque */}
          {activeSection === "estoque" && (
            <div className="space-y-8">
              <EstoqueSaldo />
            </div>
          )}

          {/* Estoque Estratégico */}
          {activeSection === "estoque-estrategico" && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-semibold">Estoque Estratégico</h2>
                <p className="text-sm text-muted-foreground">Controle de estoque mínimo para peças críticas</p>
              </div>
              <EstoqueEstrategico />
            </div>
          )}

          {/* Gerenciar */}
          {activeSection === "gerenciar" && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">Gerenciar Máquinas</h2>
                  <p className="text-sm text-muted-foreground">Adicione, edite ou remova máquinas do sistema</p>
                </div>
                <Button onClick={handleAddNew} className="gap-2 bg-primary">
                  <Plus className="h-4 w-4" />
                  Nova Máquina
                </Button>
              </div>

              <MachineFilters
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                tipoFilter={tipoFilter}
                onTipoFilterChange={setTipoFilter}
                localizacaoFilter={localizacaoFilter}
                onLocalizacaoFilterChange={setLocalizacaoFilter}
                contratoFilter={contratoFilter}
                onContratoFilterChange={setContratoFilter}
                tipos={tipos}
                localizacoes={localizacoes}
              />

              <MachineTable machines={filteredMachines} onEdit={handleEdit} onDelete={handleDelete} />
            </div>
          )}

          {/* Configurações */}
          {activeSection === "config" && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-semibold">Configurações</h2>
                <p className="text-sm text-muted-foreground">Edite as informações do contrato e configurações gerais</p>
              </div>
              <Configuracoes />
            </div>
          )}
        </div>
      </main>

      <MachineFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} machine={editingMachine} onSave={handleSave} />
    </div>
  )
}
