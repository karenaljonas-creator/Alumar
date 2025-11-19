"use client"

// Sistema de Gestão de Máquinas - v1.0
import { useState, useEffect, useMemo } from "react"
import type { Machine, WeeklySnapshot } from "@/lib/types"
import { 
  loadMachines, 
  saveMachines, 
  downloadCSV, 
  importFromCSV 
} from "@/lib/supabase-machine-storage"
import { migrateLocalStorageToSupabase, isMigrationDone } from "@/lib/migration"
import { loadContrato } from "@/lib/contrato-storage"
import {
  saveWeeklySnapshot,
  loadHistory,
  deleteSnapshot,
  downloadHistoryCSV,
  getHistoryTrends,
} from "@/lib/supabase-history-storage"
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
import { AnalysisCharts } from "@/components/analysis-charts"
import { RegistroSemanal } from "@/components/registro-semanal"
import { Configuracoes } from "@/components/configuracoes"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Download, Upload, BarChart3, Settings, ClipboardList, TrendingUp } from 'lucide-react'
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

export default function Home() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [history, setHistory] = useState<WeeklySnapshot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMigrating, setIsMigrating] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [tipoFilter, setTipoFilter] = useState("todos")
  const [localizacaoFilter, setLocalizacaoFilter] = useState("todos")
  const [contratoFilter, setContratoFilter] = useState("todos")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingMachine, setEditingMachine] = useState<Machine | undefined>()
  const { toast } = useToast()
  const contrato = loadContrato()

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        
        if (!isMigrationDone()) {
          setIsMigrating(true)
          const { machinesMigrated, historyMigrated } = await migrateLocalStorageToSupabase()
          
          if (machinesMigrated || historyMigrated) {
            toast({
              title: "Dados migrados para nuvem!",
              description: "Seus dados agora estão sincronizados e podem ser compartilhados.",
            })
          }
          setIsMigrating(false)
        }
        
        const [savedMachines, savedHistory] = await Promise.all([
          loadMachines(),
          loadHistory()
        ])
        setMachines(savedMachines)
        setHistory(savedHistory)
      } catch (error) {
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar os dados do banco. Tente novamente.",
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
    let filtered = machines
    if (contratoFilter === "com-contrato") filtered = filtered.filter((m) => m.temContrato === true)
    if (contratoFilter === "sem-contrato") filtered = filtered.filter((m) => m.temContrato === false)
    return filtrarMaquinasPrincipais(filtered)
  }, [machines, contratoFilter])

  const allFilteredMachines = useMemo(() => {
    let filtered = machines
    if (contratoFilter === "com-contrato") filtered = filtered.filter((m) => m.temContrato === true)
    if (contratoFilter === "sem-contrato") filtered = filtered.filter((m) => m.temContrato === false)
    return filtered
  }, [machines, contratoFilter])

  const stats = useMemo(() => {
    return calculateStats(dashboardFilteredMachines)
  }, [dashboardFilteredMachines])

  const trends = useMemo(() => getHistoryTrends(), [history])

  const maquinasParadasFiltradas = useMemo(() => {
    let filtered = machines.filter((m) => m.status === "parada")
    if (contratoFilter === "com-contrato") filtered = filtered.filter((m) => m.temContrato === true)
    if (contratoFilter === "sem-contrato") filtered = filtered.filter((m) => m.temContrato === false)
    return filtered
  }, [machines, contratoFilter])

  const periodoInoperante = useMemo(
    () => analisarPeriodoInoperante(maquinasParadasFiltradas),
    [maquinasParadasFiltradas],
  )
  const porTipo = useMemo(() => analisarPorTipo(maquinasParadasFiltradas), [maquinasParadasFiltradas])
  const porLocalizacao = useMemo(() => analisarPorLocalizacao(maquinasParadasFiltradas), [maquinasParadasFiltradas])
  const acaoResponsavel = useMemo(() => analisarAcaoResponsavel(machines), [machines])
  const preventivas = useMemo(() => analisarPreventivas(dashboardFilteredMachines), [dashboardFilteredMachines])

  const preventivasOK = useMemo(() => {
    return dashboardFilteredMachines.filter((m) => m.statusPreventiva === "OK").length
  }, [dashboardFilteredMachines])

  const tipos = useMemo(() => {
    return Array.from(new Set(machines.map((m) => m.tipo))).sort()
  }, [machines])

  const localizacoes = useMemo(() => {
    return Array.from(new Set(machines.map((m) => m.localizacao))).sort()
  }, [machines])

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

  const handleExport = () => {
    downloadCSV(machines)
    toast({
      title: "Exportação concluída",
      description: "O arquivo CSV foi baixado com sucesso.",
    })
  }

  const handleImport = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".csv"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
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

  const handleSaveSnapshot = async () => {
    try {
      const snapshot = await saveWeeklySnapshot(machines)
      const updatedHistory = await loadHistory()
      setHistory(updatedHistory)
      toast({
        title: "Snapshot salvo",
        description: `Registro da semana ${snapshot.semana} foi salvo com sucesso.`,
      })
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o snapshot. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteSnapshot = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este registro?")) {
      try {
        await deleteSnapshot(id)
        const updatedHistory = await loadHistory()
        setHistory(updatedHistory)
        toast({
          title: "Registro excluído",
          description: "O snapshot foi removido do histórico.",
        })
      } catch (error) {
        toast({
          title: "Erro ao excluir",
          description: "Não foi possível excluir o snapshot. Tente novamente.",
          variant: "destructive",
        })
      }
    }
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
          <p className="text-muted-foreground">
            {isMigrating ? "Migrando seus dados para a nuvem..." : "Carregando dados..."}
          </p>
          {isMigrating && (
            <p className="text-sm text-muted-foreground mt-2">
              Isso pode levar alguns segundos na primeira vez
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground mb-4">Gestão de Máquinas</h1>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-base font-semibold text-foreground">Contrato:</span>
                  <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-sm font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                    {contrato.numero}
                  </span>
                  <span className="text-muted-foreground">|</span>
                  <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-sm font-semibold text-green-700 ring-1 ring-inset ring-green-700/10">
                    {contrato.localizacao}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Vigência:</span>
                  <span className="text-sm font-medium text-foreground">
                    {new Date(contrato.dataInicio).toLocaleDateString("pt-BR")} até{" "}
                    {new Date(contrato.dataFim).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleImport} className="gap-2 bg-transparent">
                <Upload className="h-4 w-4" />
                Importar
              </Button>
              <Button variant="outline" onClick={handleExport} className="gap-2 bg-transparent">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="painel" className="space-y-8">
          <TabsList className="grid w-full max-w-4xl grid-cols-6">
            <TabsTrigger value="painel">Painel</TabsTrigger>
            <TabsTrigger value="registro" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Registro Semanal
            </TabsTrigger>
            <TabsTrigger value="historico-maquina" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Histórico
            </TabsTrigger>
            <TabsTrigger value="gerenciar" className="gap-2">
              <Settings className="h-4 w-4" />
              Gerenciar
            </TabsTrigger>
            <TabsTrigger value="analises" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Análises
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-2">
              <Settings className="h-4 w-4" />
              Config
            </TabsTrigger>
          </TabsList>

          <TabsContent value="painel" className="space-y-8">
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
              <StatusChart stats={stats} machines={allFilteredMachines} contratoFilter={contratoFilter} />
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
          </TabsContent>

          <TabsContent value="registro" className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold">Registro Semanal ⭐</h2>
              <p className="text-sm text-muted-foreground">
                Preencha os dados de todas as máquinas semanalmente - Formato planilha
              </p>
            </div>

            <RegistroSemanal machines={machines} onSaveAll={handleSaveRegistroSemanal} />
          </TabsContent>

          <TabsContent value="historico-maquina" className="space-y-8">
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
          </TabsContent>

          <TabsContent value="gerenciar" className="space-y-8">
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
          </TabsContent>

          <TabsContent value="analises" className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold">Análises Detalhadas</h2>
              <p className="text-sm text-muted-foreground">
                Visualização completa de período inoperante, tipos, localização e preventivas
              </p>
            </div>

            <AnalysisCharts
              periodoInoperante={periodoInoperante}
              porTipo={porTipo}
              porLocalizacao={porLocalizacao}
              acaoResponsavel={acaoResponsavel}
              preventivas={preventivas}
            />
          </TabsContent>

          <TabsContent value="config" className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold">Configurações</h2>
              <p className="text-sm text-muted-foreground">Edite as informações do contrato e configurações gerais</p>
            </div>

            <Configuracoes />
          </TabsContent>
        </Tabs>
      </div>

      <MachineFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} machine={editingMachine} onSave={handleSave} />
    </div>
  )
}
