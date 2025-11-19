"use server"

import { saveWeeklySnapshot } from "./history-storage"
import type { WeeklySnapshot } from "./types"

export async function importHistoricalData(jsonData: string) {
  try {
    const data = JSON.parse(jsonData)
    const snapshots = data.snapshots as WeeklySnapshot[]

    let imported = 0
    let errors = 0

    for (const snapshot of snapshots) {
      try {
        await saveWeeklySnapshot(snapshot)
        imported++
      } catch (error) {
        console.error(`Erro ao importar snapshot ${snapshot.week}:`, error)
        errors++
      }
    }

    return {
      success: true,
      imported,
      errors,
      total: snapshots.length,
    }
  } catch (error) {
    console.error("Erro ao processar dados históricos:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    }
  }
}
