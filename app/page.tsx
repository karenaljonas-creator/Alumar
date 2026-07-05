"use client"

// Sistema de Gestão de Máquinas - v1.0
import Image from "next/image"
import { useState, useEffect, useMemo } from "react"
import type { Machine, WeeklySnapshot } from "@/lib/types"
import { loadMachines, saveMachines, downloadCSV, importFromCSV } from "@/lib/supabase-machine-storage"
import { downloadCsv, detectCsvDelimiter, parseCsvLine } from "@/lib/utils"
import { loadContrato } from "@/lib/contrato-storage"
import { saveWeeklySnapshot, loadHistory, deleteSnapshot, getHistoryTrends } from "@/lib/supabase-history-storage"
import {
  calculateStats,
  analisarPeriodoInoperante,
  analisarPorLocalizacao,
  analisarAcaoResponsavel,
  analisarPreventivas,
  filtrarMaquinasPrincipais,
} from "@/lib/machine-utils"
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
import { GraficoLocalizacao } from "@/components/grafico-localizacao"
import { PainelResumo } from "@/components/painel-resumo"
import { GraficoDisponibilidadeSemanal } from "@/components/grafico-disponibilidade-semanal"
import { CausaParadasChart } from "@/components/causa-paradas-chart"
import { TopMaquinasCriticas } from "@/components/top-maquinas-criticas"
import { ParadasPorSemanaChart } from "@/components/paradas-por-semana-chart"
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

  // Variação vs. semana passada: compara com o snapshot da semana anterior DISTINTA
  const statsTrend = useMemo(() => {
    if (!history || history.length < 1) return undefined
    // Mais recentes primeiro
    const sorted = [...history].sort(
      (a, b) => new Date(b.dataRegistro).getTime() - new Date(a.dataRegistro).getTime(),
    )
    // Semana do registro mais recente (é a semana "atual" exibida)
    const semanaAtual = sorted[0]?.semana
    // Primeiro snapshot de uma semana diferente (a semana passada de fato)
    const previousSnapshot = sorted.find((s) => s.semana !== semanaAtual && s.machines?.length)
    if (!previousSnapshot?.machines?.length) return undefined

    let previousMachines = previousSnapshot.machines
    if (contratoFilter === "com-contrato") previousMachines = previousMachines.filter((m) => m.temContrato === true)
    if (contratoFilter === "sem-contrato") previousMachines = previousMachines.filter((m) => m.temContrato === false)
    const previousStats = calculateStats(filtrarMaquinasPrincipais(previousMachines))

    return {
      disponibilidadeDelta: stats.disponibilidadeContrato - previousStats.disponibilidadeContrato,
      paradasDelta: stats.paradas - previousStats.paradas,
    }
  }, [history, contratoFilter, stats])

  const maquinasParadasFiltradas = useMemo(() => {
    let filtered = machines.filter((m) => m.status === "parada")
    if (contratoFilter === "com-contrato") filtered = filtered.filter((m) => m.temContrato === true)
    if (contratoFilter === "sem-contrato") filtered = filtered.filter((m) => m.temContrato === false)
    return filtered
  }, [machines, contratoFilter])

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
    const today = new Date().toISOString().split("T")[0]
    // Converte datas (ISO ou yyyy-mm-dd) para dd/mm/aaaa
    const formatDateBR = (d: string | null | undefined): string => {
      if (!d) return ""
      const datePart = String(d).split("T")[0]
      const m = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/)
      return m ? `${m[3]}/${m[2]}/${m[1]}` : String(d)
    }
    const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100

    try {
      if (activeSection === "estoque") {
        // Exportar o SALDO agregado (igual à tela), não os registros crus do banco
        const supabase = (await import("@/lib/supabase/client")).createClient()
        const [entradasRes, saidasRes] = await Promise.all([
          supabase.from("estoque_pecas").select("*"),
          supabase.from("saida_pecas").select("*"),
        ])
        if (entradasRes.error || saidasRes.error) {
          toast({ title: "Erro ao exportar", description: (entradasRes.error || saidasRes.error)!.message, variant: "destructive" })
          return
        }
        const entradas = entradasRes.data || []
        const saidas = saidasRes.data || []
        const map = new Map<string, { codigo: string; descricao: string; totalEntrada: number; totalSaida: number; valorTotalEntrada: number }>()
        entradas.forEach((e) => {
          const cur = map.get(e.codigo)
          if (cur) {
            cur.totalEntrada += e.quantidade || 0
            cur.valorTotalEntrada += e.valor_total || 0
          } else {
            map.set(e.codigo, { codigo: e.codigo, descricao: e.descricao || "", totalEntrada: e.quantidade || 0, totalSaida: 0, valorTotalEntrada: e.valor_total || 0 })
          }
        })
        saidas.forEach((s) => {
          const cur = map.get(s.codigo)
          if (cur) cur.totalSaida += s.quantidade || 0
          else map.set(s.codigo, { codigo: s.codigo, descricao: s.descricao || "", totalEntrada: 0, totalSaida: s.quantidade || 0, valorTotalEntrada: 0 })
        })
        const items = Array.from(map.values())
          .map((it) => {
            const saldo = it.totalEntrada - it.totalSaida
            const valorMedio = it.totalEntrada > 0 ? it.valorTotalEntrada / it.totalEntrada : 0
            return { ...it, saldo, valorMedio, valorTotalSaldo: saldo * valorMedio }
          })
          .sort((a, b) => a.codigo.localeCompare(b.codigo))

        if (items.length === 0) {
          toast({ title: "Nenhum dado", description: "Não há itens em estoque para exportar.", variant: "destructive" })
          return
        }
        const headers = ["Código (PN)", "Descrição", "Entrada", "Saída", "Saldo", "Valor Médio Unit. (R$)", "Valor Total (R$)"]
        const rows = items.map((it) => [
          it.codigo,
          it.descricao,
          it.totalEntrada,
          it.totalSaida,
          it.saldo,
          round2(it.valorMedio),
          it.saldo > 0 ? round2(it.valorTotalSaldo) : 0,
        ])
        downloadCsv(`estoque-${today}.csv`, headers, rows)
        toast({ title: "Exportação concluída", description: "Saldo de estoque exportado com sucesso." })
        return
      }

      if (activeSection === "entrada") {
        const supabase = (await import("@/lib/supabase/client")).createClient()
        const { data, error } = await supabase.from("estoque_pecas").select("*").order("data_emissao", { ascending: false })
        if (error) {
          toast({ title: "Erro ao exportar", description: error.message, variant: "destructive" })
          return
        }
        if (!data || data.length === 0) {
          toast({ title: "Nenhum dado", description: "Não há entradas para exportar.", variant: "destructive" })
          return
        }
        const headers = ["Código", "Descrição", "Quantidade", "Ordem de Serviço", "Número de Série", "Nota Fiscal", "Data de Emissão", "Valor Unitário (R$)", "Valor Total (R$)", "Origem", "Observação"]
        const rows = data.map((e) => [
          e.codigo ?? "",
          e.descricao ?? "",
          e.quantidade ?? 0,
          e.ordem_servico ?? "",
          e.numero_serie ?? "",
          e.nota_fiscal ?? "",
          formatDateBR(e.data_emissao),
          round2(e.valor_unitario ?? 0),
          round2(e.valor_total ?? 0),
          e.origem ?? "",
          e.observacao ?? "",
        ])
        downloadCsv(`entrada-pecas-${today}.csv`, headers, rows)
        toast({ title: "Exportação concluída", description: "Entradas de peças exportadas com sucesso." })
        return
      }

      if (activeSection === "saida") {
        const supabase = (await import("@/lib/supabase/client")).createClient()
        const { data, error } = await supabase.from("saida_pecas").select("*").order("data_saida", { ascending: false })
        if (error) {
          toast({ title: "Erro ao exportar", description: error.message, variant: "destructive" })
          return
        }
        if (!data || data.length === 0) {
          toast({ title: "Nenhum dado", description: "Não há saídas para exportar.", variant: "destructive" })
          return
        }
        const headers = ["Código", "Descrição", "Quantidade", "Ordem de Serviço", "Nota Fiscal", "Data de Saída", "Utilização", "Área", "Compressor", "Observação"]
        const rows = data.map((s) => [
          s.codigo ?? "",
          s.descricao ?? "",
          s.quantidade ?? 0,
          s.ordem_servico ?? "",
          s.nota_fiscal ?? "",
          formatDateBR(s.data_saida),
          s.utilizacao ?? "",
          s.area ?? "",
          s.compressor ?? "",
          s.observacao ?? "",
        ])
        downloadCsv(`saida-pecas-${today}.csv`, headers, rows)
        toast({ title: "Exportação concluída", description: "Saídas de peças exportadas com sucesso." })
        return
      }

      if (activeSection === "estoque-estrategico") {
        const supabase = (await import("@/lib/supabase/client")).createClient()
        const { data, error } = await supabase
          .from("lista_mestre")
          .select("codigo, descricao, quantidade_minima")
          .order("codigo", { ascending: true })
        if (error) {
          toast({ title: "Erro ao exportar", description: error.message, variant: "destructive" })
          return
        }
        if (!data || data.length === 0) {
          toast({ title: "Nenhum dado", description: "A Lista Mestre está vazia.", variant: "destructive" })
          return
        }
        const headers = ["PN", "Descrição", "Quantidade Mínima"]
        const rows = data.map((it) => [
          it.codigo ?? "",
          it.descricao ?? "",
          it.quantidade_minima ?? 0,
        ])
        downloadCsv(`lista-mestre-estrategico-${today}.csv`, headers, rows)
        toast({ title: "Exportação concluída", description: "Lista Mestre exportada com sucesso." })
        return
      }

      // Exportar máquinas (comportamento padrão)
      downloadCSV(machines)
      toast({
        title: "Exportação concluída",
        description: "O arquivo CSV de máquinas foi baixado com sucesso.",
      })
    } catch (err: any) {
      toast({ title: "Erro ao exportar", description: err?.message || "Falha inesperada ao exportar.", variant: "destructive" })
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
          
          let rows: Record<string, string | number | null>[] = []
          
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

            // Remove BOM e divide em linhas; detecta o delimitador (; ou ,)
            const content = csvContent.replace(/^\uFEFF/, "")
            const lines = content.split(/\r?\n/).filter(line => line.trim())
            if (lines.length < 2) {
              rows = []
            } else {
              const delimiter = detectCsvDelimiter(lines[0])

              // Normaliza um cabeçalho: minúsculo, sem acentos, sem "(r$)"
              const normalize = (h: string) =>
                h.toLowerCase()
                  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                  .replace(/\(r\$\)/g, "")
                  .replace(/\s+/g, " ")
                  .trim()

              // Mapeia cabeçalhos (amigáveis ou do banco) para as colunas do banco
              const headerMap: Record<string, string> = {
                "codigo": "codigo",
                "descricao": "descricao",
                "quantidade": "quantidade", "qtd": "quantidade",
                "ordem de servico": "ordem_servico", "ordem_servico": "ordem_servico", "pedido / o.s": "ordem_servico",
                "numero de serie": "numero_serie", "numero_serie": "numero_serie", "serie": "numero_serie",
                "nota fiscal": "nota_fiscal", "nota_fiscal": "nota_fiscal", "nf": "nota_fiscal",
                "data de emissao": "data_emissao", "data_emissao": "data_emissao", "data envio": "data_emissao",
                "valor unitario": "valor_unitario", "valor_unitario": "valor_unitario", "valor": "valor_unitario",
                "valor total": "valor_total", "valor_total": "valor_total",
                "origem": "origem",
                "observacao": "observacao", "obs": "observacao",
                "data de saida": "data_saida", "data_saida": "data_saida",
                "utilizacao": "utilizacao",
                "area": "area",
                "compressor": "compressor",
              }

              const validFields = activeSection === "saida"
                ? ["codigo", "descricao", "quantidade", "ordem_servico", "nota_fiscal", "data_saida", "utilizacao", "area", "compressor", "observacao"]
                : ["codigo", "descricao", "quantidade", "ordem_servico", "numero_serie", "nota_fiscal", "data_emissao", "valor_unitario", "valor_total", "origem", "observacao"]

              const headerCols = parseCsvLine(lines[0], delimiter).map(normalize)

              const toNumber = (v: string) => {
                const s = v.replace(/r\$/gi, "").trim()
                // Remove separador de milhar e usa ponto decimal
                const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s
                return parseFloat(normalized) || 0
              }
              const toIsoDate = (v: string): string | null => {
                if (!v) return null
                const br = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
                if (br) return `${br[3]}-${br[2]}-${br[1]}`
                const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/)
                if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
                return null
              }

              rows = lines.slice(1).map(line => {
                const values = parseCsvLine(line, delimiter)
                const obj: Record<string, string | number | null> = {}
                headerCols.forEach((h, i) => {
                  const col = headerMap[h]
                  if (!col || !validFields.includes(col)) return
                  const raw = values[i] ?? ""
                  if (col === "quantidade") obj[col] = parseInt(raw) || 0
                  else if (col === "valor_unitario" || col === "valor_total") obj[col] = toNumber(raw)
                  else if (col === "data_emissao" || col === "data_saida") obj[col] = toIsoDate(raw)
                  else obj[col] = raw
                })
                return obj
              }).filter(row => row.codigo) as Record<string, string | number | null>[]
            }
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
      {/* Sidebar fixa (224px): ícone + texto */}
      <aside className="fixed z-40 flex h-screen w-56 flex-col bg-[#0092bc] text-white shadow-lg">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-white/15 px-3 py-3">
          <Image
            src="/images/atlas-copco-oficial.png"
            alt="Atlas Copco"
            width={4167}
            height={2775}
            className="h-auto w-[130px] object-contain"
            priority
          />
          <h1 className="mt-2 text-sm font-bold text-white">Gestão de Máquinas</h1>
          <div className="mt-1.5 text-xs">
            <span className="inline-flex items-center rounded bg-white/15 px-1.5 py-0.5 font-medium text-white">
              {contrato.numero}
            </span>
            <span className="mx-1 text-white/60">|</span>
            <span className="text-white/80">{contrato.localizacao}</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2 sidebar-scroll">
          {/* Main Menu Items */}
          <div className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  activeSection === item.id
                    ? "bg-white text-[#0092bc]"
                    : "text-white/80 hover:bg-white/10 hover:text-white",
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Gestão de Materiais */}
          <div className="mt-4">
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white/50">
              Gestão de Materiais
            </div>
            <div className="mt-1 space-y-1">
              {materiaisItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    activeSection === item.id
                      ? "bg-white text-[#0092bc]"
                      : "text-white/80 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-white/15" />

          {/* Config Items */}
          <div className="space-y-1">
            {configItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  activeSection === item.id
                    ? "bg-white text-[#0092bc]"
                    : "text-white/80 hover:bg-white/10 hover:text-white",
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Footer: importar / exportar */}
        <div className="flex flex-shrink-0 gap-2 border-t border-white/15 p-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleImport}
            className="flex-1 border-white/30 bg-transparent text-xs text-white hover:bg-white/10 hover:text-white"
          >
            <Upload className="mr-1 h-3 w-3" />
            Importar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="flex-1 border-white/30 bg-transparent text-xs text-white hover:bg-white/10 hover:text-white"
          >
            <Download className="mr-1 h-3 w-3" />
            Exportar
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-56 overflow-hidden">
        <div className="h-screen overflow-y-auto p-4 w-full">
          {/* Painel de Controle */}
          {activeSection === "painel" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold leading-tight">Painel de Controle</h2>
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

              {/* Linha 1: Resumo (Disponibilidade da Planta + KPIs + Disponibilidade Semanal) */}
              <PainelResumo
                stats={stats}
                preventivas={preventivas}
                trend={statsTrend}
                chart={<GraficoDisponibilidadeSemanal contratoFilter={contratoFilter} />}
              />

              {/* Linha 2: Top 5 Críticas (largo) + Causa das Paradas */}
              <div className="grid gap-3 lg:grid-cols-5 [&>*]:min-w-0">
                <div className="lg:col-span-3">
                  <TopMaquinasCriticas
                    machines={maquinasParadasFiltradas}
                    onVerTodas={() => setActiveSection("paradas")}
                  />
                </div>
                <div className="lg:col-span-2">
                  <CausaParadasChart machines={maquinasParadasFiltradas} />
                </div>
              </div>

              {/* Linha 3: Período Inoperante + Paradas por Semana + Localização */}
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
                <GraficoPeriodoInoperante machines={maquinasParadasFiltradas} />
                <ParadasPorSemanaChart history={history} contratoFilter={contratoFilter} />
                <GraficoLocalizacao data={porLocalizacao} />
              </div>
            </div>
          )}

          {/* Registro Semanal */}
          {activeSection === "registro" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold">Registro Semanal</h2>
                <p className="text-sm text-muted-foreground">
                  Preencha os dados de todas as máquinas semanalmente - Formato planilha
                </p>
              </div>
              <RegistroSemanal machines={machines} onSaveAll={handleSaveRegistroSemanal} />
            </div>
          )}

          {/* Histórico */}
          {activeSection === "historico" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Histórico de Máquinas</h2>
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
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold">Gestão de Máquinas Paradas</h2>
                <p className="text-sm text-muted-foreground">
                  Acompanhe todas as máquinas paradas com dados do último registro semanal
                </p>
              </div>
              <GestaoParadas machines={machines} onUpdate={handleSaveRegistroSemanal} />
            </div>
          )}

          {/* Entrada */}
          {activeSection === "entrada" && (
            <div className="space-y-5">
              <EntradaPecas />
            </div>
          )}

          {/* Saída */}
          {activeSection === "saida" && (
            <div className="space-y-5">
              <SaidaPecas machines={machines} />
            </div>
          )}

          {/* Estoque */}
          {activeSection === "estoque" && (
            <div className="space-y-5">
              <EstoqueSaldo />
            </div>
          )}

          {/* Estoque Estratégico */}
          {activeSection === "estoque-estrategico" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold">Estoque Estratégico</h2>
                <p className="text-sm text-muted-foreground">Controle de estoque mínimo para peças críticas</p>
              </div>
              <EstoqueEstrategico />
            </div>
          )}

          {/* Gerenciar */}
          {activeSection === "gerenciar" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Gerenciar Máquinas</h2>
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
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold">Configurações</h2>
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
