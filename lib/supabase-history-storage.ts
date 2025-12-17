"use client"

import type { Machine, WeeklySnapshot, HistoryTrend } from "./types"
import { calculateStats, filtrarMaquinasPrincipais } from "./machine-utils"
import { createClient } from "./supabase/client"
import { loadContrato } from "./contrato-storage"

// Helper to safely get Supabase client - throws if unavailable
function getSupabaseClient() {
  const client = createClient()
  if (!client) {
    throw new Error("Supabase não está disponível. Verifique se a instância está ativa.")
  }
  return client
}

function getCurrentContractId(): string {
  const contrato = loadContrato()
  return contrato.numero
}

export async function saveWeeklySnapshot(machines: Machine[]): Promise<WeeklySnapshot> {
  const now = new Date()
  const weekNumber = getWeekNumber(now)
  const year = now.getFullYear()
  const semana = `${year}-W${String(weekNumber).padStart(2, "0")}`

  const maquinasPrincipais = filtrarMaquinasPrincipais(machines).map((m) => ({
    ...m,
    acaoResponsavel: m.acaoResponsavel || "Vale", // Define "Vale" como padrão se estiver vazio
  }))

  const stats = calculateStats(maquinasPrincipais)

  const maquinasParadas = machines
    .filter((m) => m.status === "parada" || m.status === "manutencao")
    .map((m) => ({
      id: m.id,
      nome: m.nome,
      tipo: m.tipo,
      motivoParada: m.motivoParada || "Não especificado",
      localizacao: m.localizacao,
      acaoResponsavel: m.acaoResponsavel || "Vale", // Garantir valor padrão
      responsavel: m.responsavel,
      dataParada: m.dataParada,
      tempoParada: m.tempoParada,
      temContrato: m.temContrato,
      statusPreventiva: m.statusPreventiva,
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

  const { error } = await supabase.from("weekly_snapshots").insert({
    week: semana,
    date: now.toISOString(),
    snapshot: snapshot,
  })

  if (error) {
    console.error("Erro ao salvar snapshot:", error)
    throw new Error(`Erro ao salvar registro semanal: ${error.message}`)
  }

  return snapshot
}

export async function loadHistory(): Promise<WeeklySnapshot[]> {
  try {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from("weekly_snapshots")
      .select("*")
      .order("date", { ascending: false })
      .limit(100)

    if (error) {
      throw new Error(`Erro ao carregar histórico: ${error.message}`)
    }

    if (!data || data.length === 0) {
      return []
    }

    return data.map((row) => row.snapshot as WeeklySnapshot)
  } catch (error) {
    console.error("Erro ao carregar histórico:", error)
    throw error
  }
}

export async function getHistoryTrends(): Promise<HistoryTrend[]> {
  const history = await loadHistory()
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
  const history = await loadHistory()
  const snapshot = history.find((h) => h.id === id)

  if (!snapshot) {
    return
  }

  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from("weekly_snapshots")
    .delete()
    .eq("week", snapshot.semana)
    .eq("date", snapshot.dataRegistro)

  if (error) {
    throw new Error(`Erro ao deletar snapshot: ${error.message}`)
  }
}

export async function clearAllSnapshots(): Promise<void> {
  const supabase = getSupabaseClient()

  const { error } = await supabase.from("weekly_snapshots").delete().neq("id", 0)

  if (error) {
    console.error("Erro ao limpar snapshots:", error)
    throw new Error(`Erro ao limpar snapshots: ${error.message}`)
  }
}

export function exportHistoryToCSV(history: WeeklySnapshot[]): string {
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

export function downloadHistoryCSV(history: WeeklySnapshot[]): void {
  const csv = exportHistoryToCSV(history)
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

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}
