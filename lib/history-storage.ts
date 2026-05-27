"use client"

import type { Machine, WeeklySnapshot, HistoryTrend } from "./types"
import { calculateStats, filtrarMaquinasPrincipais } from "./machine-utils"
import { dadosReaisMaquinas } from "./dados-reais"
import { createClient } from "./supabase/client"

const HISTORY_STORAGE_KEY = "gestao-maquinas-historico"
const CONTRACT_ID = "CT-2025-001"

function getSupabaseClient() {
  return createClient()
}

export async function saveWeeklySnapshotToSupabase(machines: Machine[]): Promise<WeeklySnapshot> {
  const now = new Date()
  const weekNumber = getWeekNumber(now)
  const year = now.getFullYear()
  const semana = `${year}-W${String(weekNumber).padStart(2, "0")}`

  const maquinasPrincipais = filtrarMaquinasPrincipais(machines)
  const stats = calculateStats(maquinasPrincipais)

  const maquinasParadas = machines
    .filter((m) => m.status === "parada" || m.status === "manutencao")
    .map((m) => ({
      id: m.id,
      nome: m.nome,
      tipo: m.tipo,
      motivoParada: m.motivoParada || "Não especificado",
      localizacao: m.localizacao,
    }))

  const snapshot: WeeklySnapshot = {
    id: Date.now().toString(),
    semana,
    dataRegistro: now.toISOString(),
    stats,
    machines: maquinasPrincipais,
    maquinasParadas,
  }

  const supabase = getSupabaseClient()

  const { error } = await supabase.from("historical_snapshots").upsert(
    {
      contract_id: CONTRACT_ID,
      week_number: semana,
      week_date: now.toISOString().split("T")[0],
      snapshot_data: snapshot,
    },
    {
      onConflict: "contract_id,week_number",
    },
  )

  if (error) {
    console.error("[v0] Error saving snapshot to Supabase:", error)
    // Fallback to localStorage if Supabase fails
    saveWeeklySnapshotToLocalStorage(snapshot)
  }

  return snapshot
}

function saveWeeklySnapshotToLocalStorage(snapshot: WeeklySnapshot): void {
  const history = loadHistoryFromLocalStorage()
  const existingIndex = history.findIndex((h) => h.semana === snapshot.semana)

  if (existingIndex >= 0) {
    history[existingIndex] = snapshot
  } else {
    history.push(snapshot)
  }

  history.sort((a, b) => new Date(b.dataRegistro).getTime() - new Date(a.dataRegistro).getTime())

  if (typeof window !== "undefined") {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history))
  }
}

export function saveWeeklySnapshot(machines: Machine[]): WeeklySnapshot {
  const now = new Date()
  const weekNumber = getWeekNumber(now)
  const year = now.getFullYear()
  const semana = `${year}-W${String(weekNumber).padStart(2, "0")}`

  const maquinasPrincipais = filtrarMaquinasPrincipais(machines)
  const stats = calculateStats(maquinasPrincipais)

  const maquinasParadas = machines
    .filter((m) => m.status === "parada" || m.status === "manutencao")
    .map((m) => ({
      id: m.id,
      nome: m.nome,
      tipo: m.tipo,
      motivoParada: m.motivoParada || "Não especificado",
      localizacao: m.localizacao,
    }))

  const snapshot: WeeklySnapshot = {
    id: Date.now().toString(),
    semana,
    dataRegistro: now.toISOString(),
    stats,
    machines: maquinasPrincipais,
    maquinasParadas,
  }

  saveWeeklySnapshotToLocalStorage(snapshot)
  return snapshot
}

export async function loadHistoryFromSupabase(): Promise<WeeklySnapshot[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("historical_snapshots")
    .select("*")
    .eq("contract_id", CONTRACT_ID)
    .order("week_date", { ascending: false })

  if (error) {
    console.error("[v0] Error loading history from Supabase:", error)
    // Fallback to localStorage if Supabase fails
    return loadHistoryFromLocalStorage()
  }

  if (!data || data.length === 0) {
    // If no data in Supabase, try to migrate from localStorage
    const localHistory = loadHistoryFromLocalStorage()
    if (localHistory.length > 0) {
      await migrateLocalStorageToSupabase(localHistory)
      return localHistory
    }
    return getInitialHistory()
  }

  return data.map((row) => row.snapshot_data as WeeklySnapshot)
}

function loadHistoryFromLocalStorage(): WeeklySnapshot[] {
  if (typeof window !== "undefined") {
    const data = localStorage.getItem(HISTORY_STORAGE_KEY)
    if (data) {
      return JSON.parse(data)
    }
  }
  return []
}

export async function migrateLocalStorageToSupabase(snapshots?: WeeklySnapshot[]): Promise<void> {
  const supabase = getSupabaseClient()
  const history = snapshots || loadHistoryFromLocalStorage()

  if (history.length === 0) {
    console.log("[v0] No localStorage data to migrate")
    return
  }

  console.log(`[v0] Migrating ${history.length} snapshots to Supabase...`)

  const records = history.map((snapshot) => ({
    contract_id: CONTRACT_ID,
    week_number: snapshot.semana,
    week_date: new Date(snapshot.dataRegistro).toISOString().split("T")[0],
    snapshot_data: snapshot,
  }))

  const { error } = await supabase.from("historical_snapshots").upsert(records, {
    onConflict: "contract_id,week_number",
  })

  if (error) {
    console.error("[v0] Error migrating to Supabase:", error)
  } else {
    console.log("[v0] Migration completed successfully!")
  }
}

export function loadHistory(): WeeklySnapshot[] {
  // This is a sync function, so we return localStorage data
  // Components should use loadHistoryFromSupabase() for async loading
  return loadHistoryFromLocalStorage()
}

export function getHistoryTrends(): HistoryTrend[] {
  const history = loadHistory()
  return history
    .map((snapshot) => ({
      semana: snapshot.semana,
      total: snapshot.stats.total,
      operacionais: snapshot.stats.operacionais,
      paradas: snapshot.stats.paradas,
      manutencao: snapshot.stats.manutencao,
      disponibilidade: snapshot.stats.disponibilidade,
    }))
    .reverse()
}

export async function deleteSnapshot(id: string): Promise<void> {
  const supabase = getSupabaseClient()

  // Find the snapshot to get its week_number
  const history = await loadHistoryFromSupabase()
  const snapshot = history.find((h) => h.id === id)

  if (snapshot) {
    const { error } = await supabase
      .from("historical_snapshots")
      .delete()
      .eq("contract_id", CONTRACT_ID)
      .eq("week_number", snapshot.semana)

    if (error) {
      console.error("[v0] Error deleting snapshot from Supabase:", error)
    }
  }

  // Also delete from localStorage as fallback
  const localHistory = loadHistoryFromLocalStorage()
  const filtered = localHistory.filter((h) => h.id !== id)
  if (typeof window !== "undefined") {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(filtered))
  }
}

export function exportHistoryToCSV(): string {
  const history = loadHistory()
  const headers = [
    "Semana",
    "Data Registro",
    "Total Máquinas",
    "Operacionais",
    "Paradas",
    "Manutenção",
    "Disponibilidade (%)",
    "Máquinas Paradas (Detalhes)",
  ]

  const rows = history.map((snapshot) => [
    snapshot.semana,
    new Date(snapshot.dataRegistro).toLocaleDateString("pt-BR"),
    snapshot.stats.total,
    snapshot.stats.operacionais,
    snapshot.stats.paradas,
    snapshot.stats.manutencao,
    snapshot.stats.disponibilidade.toFixed(1),
    snapshot.maquinasParadas.map((m) => `${m.nome} (${m.motivoParada})`).join("; "),
  ])

  return [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n")
}

export function downloadHistoryCSV(): void {
  const csv = exportHistoryToCSV()
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)

  link.setAttribute("href", url)
  link.setAttribute("download", `historico-maquinas-${new Date().toISOString().split("T")[0]}.csv`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export async function clearAndResetHistory(): Promise<void> {
  const supabase = getSupabaseClient()

  const { error } = await supabase.from("historical_snapshots").delete().eq("contract_id", CONTRACT_ID)

  if (error) {
    console.error("[v0] Error clearing Supabase history:", error)
  }

  if (typeof window !== "undefined") {
    localStorage.removeItem(HISTORY_STORAGE_KEY)
  }
}

export function getLatestSnapshot(): WeeklySnapshot | null {
  const history = loadHistory()
  return history.length > 0 ? history[0] : null
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function getInitialHistory(): WeeklySnapshot[] {
  const snapshots: WeeklySnapshot[] = []

  const maquinasReais = dadosReaisMaquinas.map((m) => ({
    id: m.id,
    nome: m.tag,
    tipo: m.tipo,
    modelo: m.modelo,
    numeroSerie: m.numeroSerie,
    localizacao: m.localizacao,
    status: m.statusOperacional.toLowerCase() as "operacional" | "parada" | "manutencao",
    motivoParada: m.observacoes,
    dataParada: m.dataParada,
    statusPreventiva: m.manutencaoPreventiva,
    acaoResponsavel: m.acao,
    temContrato: m.temContrato,
    responsavel: m.responsavel,
    tempo: m.tempo,
    observacoes: m.observacoes,
    data: m.dataParada || "2025-09-15",
  }))

  const maquinasPrincipais = filtrarMaquinasPrincipais(maquinasReais)
  const maquinasParadasSemana38 = maquinasReais.filter((m) => m.status === "parada")

  snapshots.push({
    id: "hist-real-1",
    semana: "2025-W38",
    dataRegistro: "2025-09-15T00:00:00.000Z",
    stats: calculateStats(maquinasPrincipais),
    machines: maquinasPrincipais,
    maquinasParadas: maquinasParadasSemana38.map((m) => ({
      id: m.id,
      nome: m.nome,
      tipo: m.tipo,
      motivoParada: m.observacoes || "Não especificado",
      localizacao: m.localizacao,
    })),
  })

  snapshots.push({
    id: "hist-real-2",
    semana: "2025-W40",
    dataRegistro: "2025-09-29T00:00:00.000Z",
    stats: calculateStats(maquinasPrincipais),
    machines: maquinasPrincipais,
    maquinasParadas: maquinasParadasSemana38.map((m) => ({
      id: m.id,
      nome: m.nome,
      tipo: m.tipo,
      motivoParada: m.observacoes || "Não especificado",
      localizacao: m.localizacao,
    })),
  })

  snapshots.push({
    id: "hist-real-3",
    semana: "2025-W41",
    dataRegistro: "2025-10-06T00:00:00.000Z",
    stats: calculateStats(maquinasPrincipais),
    machines: maquinasPrincipais,
    maquinasParadas: maquinasParadasSemana38.map((m) => ({
      id: m.id,
      nome: m.nome,
      tipo: m.tipo,
      motivoParada: m.observacoes || "Não especificado",
      localizacao: m.localizacao,
    })),
  })

  snapshots.push({
    id: "hist-real-4",
    semana: "2025-W42",
    dataRegistro: "2025-10-13T00:00:00.000Z",
    stats: calculateStats(maquinasPrincipais),
    machines: maquinasPrincipais,
    maquinasParadas: maquinasParadasSemana38.map((m) => ({
      id: m.id,
      nome: m.nome,
      tipo: m.tipo,
      motivoParada: m.observacoes || "Não especificado",
      localizacao: m.localizacao,
    })),
  })

  return snapshots
}
