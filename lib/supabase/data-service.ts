"use server"

import { query } from "@/lib/db"
import type { Machine, WeeklyRecord, Stop, Settings } from "@/lib/supabase/database.types"

// ============ MACHINES ============
export async function getMachines() {
  return query<Machine>(`SELECT * FROM machines ORDER BY area, tag`)
}

export async function getMachine(id: string) {
  const rows = await query<Machine>(`SELECT * FROM machines WHERE id = $1 LIMIT 1`, [id])
  if (rows.length === 0) throw new Error("Máquina não encontrada")
  return rows[0]
}

export async function createMachine(machine: Omit<Machine, "id" | "created_at" | "updated_at">) {
  const rows = await query<Machine>(
    `INSERT INTO machines
      (name, model, area, serial_number, tag, in_contract, status, hours_worked, hours_available,
       next_maintenance, last_maintenance, maintenance_interval, responsavel, acao_responsavel)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [
      machine.name ?? "",
      machine.model ?? "",
      machine.area ?? "",
      machine.serial_number ?? "",
      machine.tag ?? "",
      machine.in_contract ?? true,
      machine.status ?? "operacional",
      machine.hours_worked ?? 0,
      machine.hours_available ?? 0,
      machine.next_maintenance || null,
      machine.last_maintenance || null,
      machine.maintenance_interval ?? 250,
      (machine as any).responsavel ?? "",
      (machine as any).acao_responsavel ?? "",
    ],
  )
  return rows[0]
}

export async function updateMachine(id: string, updates: Partial<Machine>) {
  const allowed = [
    "name", "model", "area", "serial_number", "tag", "in_contract", "status",
    "hours_worked", "hours_available", "next_maintenance", "last_maintenance",
    "maintenance_interval", "responsavel", "acao_responsavel", "categoria",
  ]
  const sets: string[] = []
  const params: any[] = []
  let i = 1
  for (const key of allowed) {
    if (key in updates) {
      sets.push(`${key} = $${i++}`)
      params.push((updates as any)[key])
    }
  }
  sets.push(`updated_at = now()`)
  params.push(id)
  const rows = await query<Machine>(
    `UPDATE machines SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
    params,
  )
  return rows[0]
}

export async function deleteMachine(id: string) {
  await query(`DELETE FROM machines WHERE id = $1`, [id])
}

// Atualiza a categoria e registra a data da mudança
export async function updateMachineCategoria(id: string, categoria: string) {
  const rows = await query<Machine>(
    `UPDATE machines SET categoria = $1, categoria_updated_at = now(), updated_at = now()
     WHERE id = $2 RETURNING *`,
    [categoria, id],
  )
  return rows[0]
}

// ============ PARADAS (HISTÓRICO) ============
export interface ParadaHistorico {
  id: string
  machine_id: string | null
  tag: string
  categoria: string | null
  observacoes: string | null
  prazo: string | null
  responsavel: string | null
  acao_responsavel: string | null
  dias_parado: number | null
  created_at: string
}

export async function getParadasHistorico(machineId: string) {
  return query<ParadaHistorico>(
    `SELECT * FROM paradas_historico WHERE machine_id = $1 ORDER BY created_at DESC`,
    [machineId],
  )
}

export async function createParadaHistorico(record: Omit<ParadaHistorico, "id" | "created_at">) {
  const rows = await query<ParadaHistorico>(
    `INSERT INTO paradas_historico
      (machine_id, tag, categoria, observacoes, prazo, responsavel, acao_responsavel, dias_parado)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      record.machine_id,
      record.tag ?? "",
      record.categoria ?? null,
      record.observacoes ?? null,
      record.prazo ?? null,
      record.responsavel ?? null,
      record.acao_responsavel ?? null,
      record.dias_parado ?? null,
    ],
  )
  return rows[0]
}

// ============ WEEKLY RECORDS ============
// Reproduz o "select *, machines(*)" do Supabase: cada linha ganha a propriedade `machines`.
export async function getWeeklyRecords() {
  const rows = await query<any>(
    `SELECT wr.*, to_jsonb(m.*) AS machines
     FROM weekly_records wr
     LEFT JOIN machines m ON m.id = wr.machine_id
     ORDER BY wr.created_at DESC`,
  )
  return rows
}

export async function getWeeklyRecordsByMachine(machineId: string) {
  return query<WeeklyRecord>(
    `SELECT * FROM weekly_records WHERE machine_id = $1 ORDER BY week DESC`,
    [machineId],
  )
}

export async function createWeeklyRecord(record: Omit<WeeklyRecord, "id" | "created_at">) {
  const rows = await query<WeeklyRecord>(
    `INSERT INTO weekly_records
      (machine_id, week, hours_worked, hours_available, availability, observations)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [
      record.machine_id,
      record.week,
      record.hours_worked ?? 0,
      record.hours_available ?? 0,
      record.availability ?? 0,
      record.observations ?? null,
    ],
  )
  // Atualiza as horas da máquina
  await query(
    `UPDATE machines SET hours_worked = $1, updated_at = now() WHERE id = $2`,
    [record.hours_worked ?? 0, record.machine_id],
  )
  return rows[0]
}

// ============ STOPS ============
export async function getStops() {
  return query<any>(
    `SELECT s.*, to_jsonb(m.*) AS machines
     FROM stops s
     LEFT JOIN machines m ON m.id = s.machine_id
     ORDER BY s.created_at DESC`,
  )
}

export async function getActiveStops() {
  return query<any>(
    `SELECT s.*, to_jsonb(m.*) AS machines
     FROM stops s
     LEFT JOIN machines m ON m.id = s.machine_id
     WHERE s.resolved = false
     ORDER BY s.start_date DESC`,
  )
}

export async function createStop(stop: Omit<Stop, "id" | "created_at">) {
  const rows = await query<Stop>(
    `INSERT INTO stops (machine_id, start_date, end_date, reason, type, description, resolved)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      stop.machine_id,
      stop.start_date ?? new Date().toISOString(),
      stop.end_date ?? null,
      stop.reason ?? "",
      stop.type ?? "outros",
      stop.description ?? null,
      stop.resolved ?? false,
    ],
  )
  // Atualiza status da máquina
  await query(`UPDATE machines SET status = 'parado', updated_at = now() WHERE id = $1`, [
    stop.machine_id,
  ])
  return rows[0]
}

export async function updateStop(id: string, updates: Partial<Stop>) {
  const allowed = ["machine_id", "start_date", "end_date", "reason", "type", "description", "resolved"]
  const sets: string[] = []
  const params: any[] = []
  let i = 1
  for (const key of allowed) {
    if (key in updates) {
      sets.push(`${key} = $${i++}`)
      params.push((updates as any)[key])
    }
  }
  if (sets.length === 0) {
    const rows = await query<any>(
      `SELECT s.*, to_jsonb(m.*) AS machines FROM stops s
       LEFT JOIN machines m ON m.id = s.machine_id WHERE s.id = $1`,
      [id],
    )
    return rows[0]
  }
  params.push(id)
  const updated = await query<Stop>(
    `UPDATE stops SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
    params,
  )
  const stop = updated[0]
  // Se resolvida, volta a máquina para operacional
  if (updates.resolved) {
    await query(`UPDATE machines SET status = 'operacional', updated_at = now() WHERE id = $1`, [
      stop.machine_id,
    ])
  }
  const rows = await query<any>(
    `SELECT s.*, to_jsonb(m.*) AS machines FROM stops s
     LEFT JOIN machines m ON m.id = s.machine_id WHERE s.id = $1`,
    [id],
  )
  return rows[0]
}

export async function resolveStop(id: string, endDate: string) {
  return updateStop(id, { resolved: true, end_date: endDate })
}

// ============ SETTINGS ============
export async function getSettings() {
  const rows = await query<Settings>(`SELECT * FROM settings ORDER BY created_at LIMIT 1`)
  return rows[0] ?? null
}

export async function updateSettings(updates: Partial<Settings>) {
  const existing = await getSettings()
  if (existing) {
    const allowed = ["client_name", "contract_number", "location", "target_availability"]
    const sets: string[] = []
    const params: any[] = []
    let i = 1
    for (const key of allowed) {
      if (key in updates) {
        sets.push(`${key} = $${i++}`)
        params.push((updates as any)[key])
      }
    }
    sets.push(`updated_at = now()`)
    params.push(existing.id)
    const rows = await query<Settings>(
      `UPDATE settings SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
      params,
    )
    return rows[0]
  } else {
    const rows = await query<Settings>(
      `INSERT INTO settings (client_name, contract_number, location, target_availability)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [
        (updates as any).client_name ?? "ALUMAR",
        (updates as any).contract_number ?? "",
        (updates as any).location ?? "",
        (updates as any).target_availability ?? 92,
      ],
    )
    return rows[0]
  }
}

// ============ WEEKLY SNAPSHOTS ============
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

export async function getWeeklySnapshots() {
  return query<WeeklySnapshot>(`SELECT * FROM weekly_snapshots ORDER BY week_date DESC`)
}

export async function getWeeklySnapshotsByWeek(weekCode: string) {
  return query<WeeklySnapshot>(
    `SELECT * FROM weekly_snapshots WHERE week_code = $1 ORDER BY created_at DESC`,
    [weekCode],
  )
}

export async function createWeeklySnapshot(machines: Machine[]) {
  const now = new Date()
  const weekNumber = getWeekNumber(now)
  const weekCode = `${now.getFullYear()}-W${weekNumber.toString().padStart(2, "0")}`

  const activeMachines = machines.filter((m) => m.status !== "desativado")
  const operacionais = machines.filter((m) => m.status === "operacional").length
  const paradas = machines.filter((m) => m.status === "parado").length
  const desativados = machines.filter((m) => m.status === "desativado").length
  const total = machines.length
  const totalAtivas = activeMachines.length
  const disponibilidade = totalAtivas > 0 ? Math.round((operacionais / totalAtivas) * 1000) / 10 : 0

  const machineDetails: MachineDetail[] = machines.map((m) => ({
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

  const rows = await query<WeeklySnapshot>(
    `INSERT INTO weekly_snapshots
      (week_code, week_date, total, operacionais, paradas, manutencao, disponibilidade, machine_details)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      weekCode,
      now.toISOString().split("T")[0],
      total,
      operacionais,
      paradas,
      desativados,
      disponibilidade,
      JSON.stringify(machineDetails),
    ],
  )
  return rows[0]
}

export async function deleteWeeklySnapshot(id: string) {
  await query(`DELETE FROM weekly_snapshots WHERE id = $1`, [id])
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
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
  status: "pendente" | "planejado" | "concluido" | "atrasado"
  order_number: string | null
  observations: string | null
  created_at: string
  updated_at: string
}

export async function getPreventiveMaintenances(year?: number) {
  if (year) {
    return query<PreventiveMaintenance>(
      `SELECT * FROM preventive_maintenance WHERE year = $1 ORDER BY tag, year, month`,
      [year],
    )
  }
  return query<PreventiveMaintenance>(
    `SELECT * FROM preventive_maintenance ORDER BY tag, year, month`,
  )
}

export async function getPreventiveMaintenancesByMachine(machineId: string) {
  return query<PreventiveMaintenance>(
    `SELECT * FROM preventive_maintenance WHERE machine_id = $1 ORDER BY year, month`,
    [machineId],
  )
}

export async function createPreventiveMaintenance(
  record: Omit<PreventiveMaintenance, "id" | "created_at" | "updated_at">,
) {
  const rows = await query<PreventiveMaintenance>(
    `INSERT INTO preventive_maintenance
      (machine_id, tag, serial_number, model, area, year, month, maintenance_type, status, order_number, observations)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [
      record.machine_id ?? null,
      record.tag ?? "",
      record.serial_number ?? null,
      record.model ?? null,
      record.area ?? null,
      record.year,
      record.month,
      record.maintenance_type ?? null,
      record.status ?? "pendente",
      record.order_number ?? null,
      record.observations ?? null,
    ],
  )
  return rows[0]
}

export async function updatePreventiveMaintenance(id: string, updates: Partial<PreventiveMaintenance>) {
  const allowed = [
    "machine_id", "tag", "serial_number", "model", "area", "year", "month",
    "maintenance_type", "status", "order_number", "observations",
  ]
  const sets: string[] = []
  const params: any[] = []
  let i = 1
  for (const key of allowed) {
    if (key in updates) {
      sets.push(`${key} = $${i++}`)
      params.push((updates as any)[key])
    }
  }
  sets.push(`updated_at = now()`)
  params.push(id)
  const rows = await query<PreventiveMaintenance>(
    `UPDATE preventive_maintenance SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
    params,
  )
  return rows[0]
}

export async function upsertPreventiveMaintenance(
  record: Omit<PreventiveMaintenance, "id" | "created_at" | "updated_at">,
) {
  const rows = await query<PreventiveMaintenance>(
    `INSERT INTO preventive_maintenance
      (machine_id, tag, serial_number, model, area, year, month, maintenance_type, status, order_number, observations)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (machine_id, year, month) DO UPDATE SET
       tag = EXCLUDED.tag,
       serial_number = EXCLUDED.serial_number,
       model = EXCLUDED.model,
       area = EXCLUDED.area,
       maintenance_type = EXCLUDED.maintenance_type,
       status = EXCLUDED.status,
       order_number = EXCLUDED.order_number,
       observations = EXCLUDED.observations,
       updated_at = now()
     RETURNING *`,
    [
      record.machine_id ?? null,
      record.tag ?? "",
      record.serial_number ?? null,
      record.model ?? null,
      record.area ?? null,
      record.year,
      record.month,
      record.maintenance_type ?? null,
      record.status ?? "pendente",
      record.order_number ?? null,
      record.observations ?? null,
    ],
  )
  return rows[0]
}

export async function deletePreventiveMaintenance(id: string) {
  await query(`DELETE FROM preventive_maintenance WHERE id = $1`, [id])
}

export async function bulkInsertPreventiveMaintenances(
  records: Omit<PreventiveMaintenance, "id" | "created_at" | "updated_at">[],
) {
  const results: PreventiveMaintenance[] = []
  for (const record of records) {
    results.push(await createPreventiveMaintenance(record))
  }
  return results
}

export async function clearPreventiveMaintenances() {
  await query(`DELETE FROM preventive_maintenance`)
}

// ============ COUNTS (para tela de Configurações) ============
export async function getRecordCounts() {
  const [wr] = await query<{ count: string }>(`SELECT count(*)::text AS count FROM weekly_records`)
  const [st] = await query<{ count: string }>(`SELECT count(*)::text AS count FROM stops`)
  return {
    weeklyRecordsCount: Number(wr?.count ?? 0),
    stopsCount: Number(st?.count ?? 0),
  }
}

// ============ DASHBOARD STATS ============
export async function getDashboardStats() {
  const machines = await getMachines()
  const settings = await getSettings()
  const activeStops = await query<{ id: string }>(`SELECT id FROM stops WHERE resolved = false`)

  const operatingMachines = machines.filter((m) => m.status === "operacional").length
  const stoppedMachines = machines.filter((m) => m.status === "parado").length
  const inContractMachines = machines.filter((m) => m.in_contract).length
  const outOfContractMachines = machines.filter((m) => !m.in_contract).length
  const pendingMaintenances = machines.filter(
    (m) => m.hours_worked >= m.maintenance_interval * 0.9,
  ).length

  return {
    totalMachines: machines.length,
    operatingMachines,
    stoppedMachines,
    inContractMachines,
    outOfContractMachines,
    averageAvailability: 0,
    targetAvailability: settings?.target_availability || 92,
    pendingMaintenances,
    activeStops: activeStops.length || 0,
  }
}
