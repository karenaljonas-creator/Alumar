"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload, Loader2, CheckCircle, FileSpreadsheet, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Machine, WeeklySnapshot } from "@/lib/types"
import { calculateStats, filtrarMaquinasPrincipais } from "@/lib/machine-utils"

const HISTORY_STORAGE_KEY = "gestao-maquinas-historico"

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function parseExcelDate(dateStr: string, year = 2025): { weekNumber: string; date: Date } {
  console.log("[v0] Parsing date:", dateStr)

  let date: Date

  // Format: "13/out" or similar
  if (dateStr.includes("/")) {
    const [dayStr, monthStr] = dateStr.split("/")
    const day = Number.parseInt(dayStr.trim())

    const monthMap: Record<string, number> = {
      jan: 0,
      fev: 1,
      mar: 2,
      abr: 3,
      mai: 4,
      jun: 5,
      jul: 6,
      ago: 7,
      set: 8,
      out: 9,
      nov: 10,
      dez: 11,
    }

    const month = monthMap[monthStr.toLowerCase().trim()]
    if (month === undefined) {
      throw new Error(`Mês inválido: ${monthStr}`)
    }

    date = new Date(year, month, day)
    console.log("[v0] Parsed date parts:", { day, month, year, result: date.toISOString() })
  } else {
    date = new Date(dateStr)
  }

  if (isNaN(date.getTime())) {
    throw new Error(`Data inválida: ${dateStr}`)
  }

  const weekNum = getWeekNumber(date)
  const weekStr = `${date.getFullYear()}-W${weekNum.toString().padStart(2, "0")}`

  console.log("[v0] ✓ Date converted:", dateStr, "→", weekStr, "(" + date.toLocaleDateString("pt-BR") + ")")
  return { weekNumber: weekStr, date }
}

function getColumnValue(row: any, ...possibleNames: string[]): string {
  for (const name of possibleNames) {
    if (row[name] !== undefined && row[name] !== null && row[name] !== "") {
      return row[name].toString().trim()
    }
  }
  return ""
}

export function ImportHistoricalButton() {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [manualDate, setManualDate] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      console.log("[v0] File selected:", file.name, file.size, "bytes")
      setSelectedFile(file)
      setError(null)
    }
  }

  const handleImport = async () => {
    if (!selectedFile) {
      fileInputRef.current?.click()
      return
    }

    if (!manualDate) {
      setError("Por favor, digite a data da semana (ex: 13/10/2025)")
      return
    }

    setLoading(true)
    setSuccess(false)
    setError(null)

    try {
      console.log("[v0] ========== STARTING IMPORT ==========")
      console.log("[v0] Manual date input:", manualDate)
      const dateParts = manualDate.split("/")
      if (dateParts.length !== 3) {
        throw new Error("Formato de data inválido. Use DD/MM/AAAA (ex: 13/10/2025)")
      }
      const [day, month, year] = dateParts.map((p) => Number.parseInt(p.trim()))
      const weekDate = new Date(year, month - 1, day)

      if (isNaN(weekDate.getTime())) {
        throw new Error("Data inválida. Verifique o formato DD/MM/AAAA")
      }

      const weekNum = getWeekNumber(weekDate)
      const weekNumber = `${weekDate.getFullYear()}-W${weekNum.toString().padStart(2, "0")}`
      console.log("[v0] Using manual date:", weekDate.toLocaleDateString("pt-BR"), "→", weekNumber)

      const XLSX = await import("xlsx")
      const data = await selectedFile.arrayBuffer()
      const workbook = XLSX.read(data, { type: "array" })

      const sheetName = workbook.SheetNames[0]
      console.log("[v0] Reading sheet:", sheetName)
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

      console.log("[v0] Excel data loaded:", jsonData.length, "rows")
      if (jsonData.length === 0) {
        throw new Error("Planilha vazia ou sem dados")
      }

      console.log("[v0] Column names found:", Object.keys(jsonData[0]))

      const machines: Machine[] = []
      let processedCount = 0
      let skippedCount = 0

      jsonData.forEach((row, index) => {
        try {
          const tag = getColumnValue(row, "TAG", "tag")
          const tipo = getColumnValue(row, "Tipo", "TIPO", "Type")
          const status = getColumnValue(row, "Status", "STATUS")
          const localizacao = getColumnValue(row, "LOCALIZAÇÃO", "Localização", "LOCALIZACAO", "Localizacao")
          const contrato = getColumnValue(row, "Contrato", "CONTRATO")
          const preventiva = getColumnValue(row, "Manutenções Preventivas", "Preventiva", "PREVENTIVA")
          const acao = getColumnValue(row, "Ação", "ACAO", "Acao")
          const observacoes = getColumnValue(row, "Observações", "OBSERVACOES", "Observacoes")
          const numeroSerie = getColumnValue(row, "Número de Série", "Numero de Serie", "N° Série")
          const dataParada = getColumnValue(row, "Data de Parada", "DATA DE PARADA")

          if (!tag) {
            console.log(`[v0] Row ${index + 2} skipped - missing TAG`)
            skippedCount++
            return
          }

          let machineStatus: "operacional" | "parada" | "manutencao"
          if (status === "Operacional") {
            machineStatus = "operacional"
          } else if (status === "Máquina Parada") {
            machineStatus = "parada"
          } else {
            machineStatus = "manutencao"
          }

          const machine: Machine = {
            id: `${tag}-${Date.now()}-${index}`,
            nome: tag,
            tipo: tipo || "Compressor",
            modelo: tipo || "Compressor",
            numeroSerie: numeroSerie,
            localizacao: localizacao || "Não especificado",
            status: machineStatus,
            statusPreventiva: preventiva || "OK",
            temContrato: contrato === "SIM",
            acaoResponsavel: acao || "Outro",
            observacoes: observacoes,
            dataParada: dataParada || undefined,
            data: weekDate.toISOString().split("T")[0],
            motivoParada: observacoes,
            manutencaoPreventiva: preventiva || "OK",
            responsavel: "",
          }

          machines.push(machine)
          processedCount++
        } catch (rowError) {
          console.error(`[v0] Error processing row ${index + 2}:`, rowError)
          skippedCount++
        }
      })

      console.log("[v0] ========== PROCESSING SUMMARY ==========")
      console.log("[v0] Processed:", processedCount, "machines")
      console.log("[v0] Skipped:", skippedCount, "rows")
      console.log("[v0] Week:", weekNumber)

      if (machines.length === 0) {
        throw new Error("Nenhum dado válido encontrado na planilha")
      }

      console.log(`[v0] Creating snapshot for ${weekNumber}:`)
      console.log(`[v0]   - Total machines: ${machines.length}`)

      const maquinasPrincipais = filtrarMaquinasPrincipais(machines)
      console.log(`[v0]   - Main types (for stats): ${maquinasPrincipais.length}`)

      const stats = calculateStats(maquinasPrincipais)
      console.log(
        `[v0]   - Stats: ${stats.operacionais} operacionais, ${stats.paradas} paradas, ${stats.manutencao} manutenção`,
      )

      const maquinasParadas = machines
        .filter((m) => m.status === "parada" || m.status === "manutencao")
        .map((m) => ({
          id: m.id,
          nome: m.nome,
          tipo: m.tipo,
          motivoParada: m.motivoParada || m.observacoes || "Não especificado",
          localizacao: m.localizacao,
        }))

      const snapshot: WeeklySnapshot = {
        id: `imported-${Date.now()}-${weekNumber}`,
        semana: weekNumber,
        dataRegistro: weekDate.toISOString(),
        stats, // Stats from filtered machines (main types only)
        machines, // ALL machines for detalhamento
        maquinasParadas,
      }

      console.log(
        `[v0] ✓ Snapshot created: ${weekNumber} with ${machines.length} machines, stats total: ${stats.total}`,
      )

      console.log("[v0] ========== SAVING TO LOCALSTORAGE ==========")

      const existingSnapshots = JSON.parse(
        (typeof window !== "undefined" && localStorage.getItem(HISTORY_STORAGE_KEY)) || "[]",
      )
      console.log("[v0] Existing snapshots:", existingSnapshots.length)

      const snapshotMap = new Map<string, WeeklySnapshot>()
      existingSnapshots.forEach((s: WeeklySnapshot) => snapshotMap.set(s.semana, s))
      snapshotMap.set(snapshot.semana, snapshot)

      const allSnapshots = Array.from(snapshotMap.values()).sort(
        (a, b) => new Date(b.dataRegistro).getTime() - new Date(a.dataRegistro).getTime(),
      )

      if (typeof window !== "undefined") {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(allSnapshots))
        console.log("[v0] ✓ Saved to localStorage with key:", HISTORY_STORAGE_KEY)
        console.log("[v0] ✓ Total snapshots in storage:", allSnapshots.length)
      }

      setSuccess(true)
      setLoading(false)

      console.log("[v0] ========== IMPORT COMPLETE ==========")
      setTimeout(() => {
        console.log("[v0] Reloading page...")
        window.location.reload()
      }, 2000)
    } catch (error) {
      console.error("[v0] ========== IMPORT FAILED ==========")
      console.error("[v0] Error:", error)
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido ao processar arquivo"
      setError(errorMessage)
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 bg-transparent">
          <Upload className="h-4 w-4" />
          Importar Histórico
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Importar Dados Históricos</DialogTitle>
          <DialogDescription>Carregue uma planilha Excel e digite a data da semana.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" />

          <div className="space-y-2">
            <Label htmlFor="manual-date">Data da Semana</Label>
            <Input
              id="manual-date"
              type="text"
              placeholder="13/10/2025"
              value={manualDate}
              onChange={(e) => setManualDate(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Digite a data no formato DD/MM/AAAA (ex: 13/10/2025 para semana 42)
            </p>
          </div>

          {selectedFile && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <h4 className="text-sm font-semibold mb-2">Formato esperado:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Colunas: TAG, Tipo, Contrato, Status</li>
              <li>Status: "Operacional" ou "Máquina Parada"</li>
              <li>Contrato: "SIM" ou "NÃO"</li>
              <li>Formato: .xlsx ou .xls</li>
            </ul>
          </div>

          <Button onClick={handleImport} disabled={loading || success} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando arquivo...
              </>
            ) : success ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Dados importados! Recarregando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {selectedFile ? "Importar Arquivo" : "Selecionar Arquivo Excel"}
              </>
            )}
          </Button>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Erro na importação</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100">
              <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Importação concluída!</p>
                <p className="text-sm mt-1">Os dados históricos foram importados com sucesso.</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
