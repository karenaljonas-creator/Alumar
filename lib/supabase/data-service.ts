"use client"

import { createClient } from "@/lib/supabase/client"
import type { Machine, WeeklyRecord, Stop, Settings } from "@/lib/supabase/database.types"

const supabase = createClient()

// ============ MACHINES ============
export async function getMachines() {
  const { data, error } = await supabase
    .from("machines")
    .select("*")
    .order("area")
    .order("tag")
  
  if (error) throw error
  return data as Machine[]
}

export async function getMachine(id: string) {
  const { data, error } = await supabase
    .from("machines")
    .select("*")
    .eq("id", id)
    .single()
  
  if (error) throw error
  return data as Machine
}

export async function createMachine(machine: Omit<Machine, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("machines")
    .insert(machine)
    .select()
    .single()
  
  if (error) throw error
  return data as Machine
}

export async function updateMachine(id: string, updates: Partial<Machine>) {
  const { data, error } = await supabase
    .from("machines")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()
  
  if (error) throw error
  return data as Machine
}

export async function deleteMachine(id: string) {
  const { error } = await supabase
    .from("machines")
    .delete()
    .eq("id", id)
  
  if (error) throw error
}

// ============ WEEKLY RECORDS ============
export async function getWeeklyRecords() {
  const { data, error } = await supabase
    .from("weekly_records")
    .select("*, machines(*)")
    .order("created_at", { ascending: false })
  
  if (error) throw error
  return data
}

export async function getWeeklyRecordsByMachine(machineId: string) {
  const { data, error } = await supabase
    .from("weekly_records")
    .select("*")
    .eq("machine_id", machineId)
    .order("week", { ascending: false })
  
  if (error) throw error
  return data as WeeklyRecord[]
}

export async function createWeeklyRecord(record: Omit<WeeklyRecord, "id" | "created_at">) {
  const { data, error } = await supabase
    .from("weekly_records")
    .insert(record)
    .select()
    .single()
  
  if (error) throw error
  
  // Update machine hours
  await supabase
    .from("machines")
    .update({ 
      hours_worked: record.hours_worked,
      updated_at: new Date().toISOString()
    })
    .eq("id", record.machine_id)
  
  return data as WeeklyRecord
}

// ============ STOPS ============
export async function getStops() {
  const { data, error } = await supabase
    .from("stops")
    .select("*, machines(*)")
    .order("created_at", { ascending: false })
  
  if (error) throw error
  return data
}

export async function getActiveStops() {
  const { data, error } = await supabase
    .from("stops")
    .select("*, machines(*)")
    .eq("resolved", false)
    .order("start_date", { ascending: false })
  
  if (error) throw error
  return data
}

export async function createStop(stop: Omit<Stop, "id" | "created_at">) {
  const { data, error } = await supabase
    .from("stops")
    .insert(stop)
    .select()
    .single()
  
  if (error) throw error
  
  // Update machine status
  await supabase
    .from("machines")
    .update({ status: "parado", updated_at: new Date().toISOString() })
    .eq("id", stop.machine_id)
  
  return data as Stop
}

export async function updateStop(id: string, updates: Partial<Stop>) {
  const { data, error } = await supabase
    .from("stops")
    .update(updates)
    .eq("id", id)
    .select("*, machines(*)")
    .single()
  
  if (error) throw error
  
  // If resolved, update machine status back to operacional
  if (updates.resolved) {
    await supabase
      .from("machines")
      .update({ status: "operacional", updated_at: new Date().toISOString() })
      .eq("id", data.machine_id)
  }
  
  return data
}

export async function resolveStop(id: string, endDate: string) {
  return updateStop(id, { resolved: true, end_date: endDate })
}

// ============ SETTINGS ============
export async function getSettings() {
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .limit(1)
    .single()
  
  if (error && error.code !== "PGRST116") throw error
  return data as Settings | null
}

export async function updateSettings(updates: Partial<Settings>) {
  const settings = await getSettings()
  
  if (settings) {
    const { data, error } = await supabase
      .from("settings")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", settings.id)
      .select()
      .single()
    
    if (error) throw error
    return data as Settings
  } else {
    const { data, error } = await supabase
      .from("settings")
      .insert(updates)
      .select()
      .single()
    
    if (error) throw error
    return data as Settings
  }
}

// ============ WEEKLY SNAPSHOTS ============
export interface WeeklySnapshot {
  id: string
  week_code: string
  week_date: string
  total: number
  operacionais: number
  paradas: number
  manutencao: number
  disponibilidade: number
  machine_details: MachineDetail[] | null
  created_at: string
}

export interface MachineDetail {
  id: string
  tag: string
  model: string
  area: string
  serial_number: string
  in_contract: boolean
  status: string
  responsavel: string
  acao_responsavel: string
}

export async function getWeeklySnapshots() {
  const { data, error } = await supabase
    .from("weekly_snapshots")
    .select("*")
    .order("week_date", { ascending: false })
  
  if (error) throw error
  return data as WeeklySnapshot[]
}

export async function getWeeklySnapshotsByWeek(weekCode: string) {
  const { data, error } = await supabase
    .from("weekly_snapshots")
    .select("*")
    .eq("week_code", weekCode)
    .order("created_at", { ascending: false })
  
  if (error) throw error
  return data as WeeklySnapshot[]
}

export async function createWeeklySnapshot(machines: Machine[]) {
  const now = new Date()
  const weekNumber = getWeekNumber(now)
  const weekCode = `${now.getFullYear()}-W${weekNumber.toString().padStart(2, "0")}`
  
  // Máquinas DESATIVADAS não entram no cálculo de disponibilidade
  const activeMachines = machines.filter(m => m.status !== "desativado")
  
  const operacionais = machines.filter(m => m.status === "operacional").length
  const paradas = machines.filter(m => m.status === "parado").length
  const desativados = machines.filter(m => m.status === "desativado").length
  const total = machines.length
  const totalAtivas = activeMachines.length
  
  // Disponibilidade = Operacionais / Total de máquinas ATIVAS (excluindo desativadas)
  const disponibilidade = totalAtivas > 0 ? Math.round((operacionais / totalAtivas) * 1000) / 10 : 0
  
  const machineDetails: MachineDetail[] = machines.map(m => ({
    id: m.id,
    tag: m.tag,
    model: m.model,
    area: m.area,
    serial_number: m.serial_number,
    in_contract: m.in_contract,
    status: m.status,
    responsavel: (m as any).responsavel || "",
    acao_responsavel: (m as any).acao_responsavel || "",
  }))
  
  const { data, error } = await supabase
    .from("weekly_snapshots")
    .insert({
      week_code: weekCode,
      week_date: now.toISOString().split("T")[0],
      total,
      operacionais,
      paradas,
      manutencao: desativados,
      disponibilidade,
      machine_details: machineDetails,
    })
    .select()
    .single()
  
  if (error) throw error
  return data as WeeklySnapshot
}

export async function deleteWeeklySnapshot(id: string) {
  const { error } = await supabase
    .from("weekly_snapshots")
    .delete()
    .eq("id", id)
  
  if (error) throw error
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

// ============ PREVENTIVE MAINTENANCE ============
export interface PreventiveMaintenance {
  id: string
  machine_id: string | null
  tag: string
  serial_number: string | null
  model: string | null
  area: string | null
  year: number
  month: number
  maintenance_type: string | null
  status: 'pendente' | 'planejado' | 'concluido' | 'atrasado'
  order_number: string | null
  observations: string | null
  created_at: string
  updated_at: string
}

export async function getPreventiveMaintenances(year?: number) {
  let query = supabase
    .from("preventive_maintenance")
    .select("*")
    .order("tag")
    .order("year")
    .order("month")
  
  if (year) {
    query = query.eq("year", year)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data as PreventiveMaintenance[]
}

export async function getPreventiveMaintenancesByMachine(machineId: string) {
  const { data, error } = await supabase
    .from("preventive_maintenance")
    .select("*")
    .eq("machine_id", machineId)
    .order("year")
    .order("month")
  
  if (error) throw error
  return data as PreventiveMaintenance[]
}

export async function createPreventiveMaintenance(record: Omit<PreventiveMaintenance, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("preventive_maintenance")
    .insert(record)
    .select()
    .single()
  
  if (error) throw error
  return data as PreventiveMaintenance
}

export async function updatePreventiveMaintenance(id: string, updates: Partial<PreventiveMaintenance>) {
  const { data, error } = await supabase
    .from("preventive_maintenance")
    .update(updates)
    .eq("id", id)
    .select()
    .single()
  
  if (error) throw error
  return data as PreventiveMaintenance
}

export async function upsertPreventiveMaintenance(record: Omit<PreventiveMaintenance, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("preventive_maintenance")
    .upsert(record, { onConflict: 'machine_id,year,month' })
    .select()
    .single()
  
  if (error) throw error
  return data as PreventiveMaintenance
}

export async function deletePreventiveMaintenance(id: string) {
  const { error } = await supabase
    .from("preventive_maintenance")
    .delete()
    .eq("id", id)
  
  if (error) throw error
}

export async function bulkInsertPreventiveMaintenances(records: Omit<PreventiveMaintenance, "id" | "created_at" | "updated_at">[]) {
  const { data, error } = await supabase
    .from("preventive_maintenance")
    .insert(records)
    .select()
  
  if (error) throw error
  return data as PreventiveMaintenance[]
}

export async function clearPreventiveMaintenances() {
  const { error } = await supabase
    .from("preventive_maintenance")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000") // Delete all
  
  if (error) throw error
}

// ============ DASHBOARD STATS ============
export async function getDashboardStats() {
  const machines = await getMachines()
  const settings = await getSettings()
  const { data: activeStops } = await supabase
    .from("stops")
    .select("id")
    .eq("resolved", false)
  
  const operatingMachines = machines.filter(m => m.status === "operacional").length
  const stoppedMachines = machines.filter(m => m.status === "parado").length
  const desativadosMachines = machines.filter(m => m.status === "desativado").length
  const inContractMachines = machines.filter(m => m.in_contract).length
  const outOfContractMachines = machines.filter(m => !m.in_contract).length
  const pendingMaintenances = machines.filter(m => m.hours_worked >= m.maintenance_interval * 0.9).length
  
  return {
    totalMachines: machines.length,
    operatingMachines,
    stoppedMachines,
    inContractMachines,
    outOfContractMachines,
    averageAvailability: 0,
    targetAvailability: settings?.target_availability || 92,
    pendingMaintenances,
    activeStops: activeStops?.length || 0,
  }
}
