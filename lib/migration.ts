"use client"

import type { Machine, WeeklySnapshot } from "./types"
import { saveMachines } from "./supabase-machine-storage"
import { saveWeeklySnapshot } from "./supabase-history-storage"

export async function migrateLocalStorageToSupabase(): Promise<{
  machinesMigrated: boolean
  historyMigrated: boolean
}> {
  let machinesMigrated = false
  let historyMigrated = false

  try {
    const savedMachinesStr = localStorage.getItem("machines")
    if (savedMachinesStr) {
      const machines: Machine[] = JSON.parse(savedMachinesStr)
      if (machines.length > 0) {
        await saveMachines(machines)
        machinesMigrated = true
      }
    }

    const savedHistoryStr = localStorage.getItem("weeklySnapshots")
    if (savedHistoryStr) {
      const snapshots: WeeklySnapshot[] = JSON.parse(savedHistoryStr)
      if (snapshots.length > 0) {
        for (const snapshot of snapshots) {
          try {
            await saveWeeklySnapshot(snapshot.machines)
          } catch (error) {
            // Ignorar erros de migração individual
          }
        }
        historyMigrated = true
      }
    }

    if (machinesMigrated || historyMigrated) {
      localStorage.setItem("supabase_migration_v2_done", "true")
    }

    return { machinesMigrated, historyMigrated }
  } catch (error) {
    return { machinesMigrated: false, historyMigrated: false }
  }
}

export function isMigrationDone(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem("supabase_migration_v2_done") === "true"
}
