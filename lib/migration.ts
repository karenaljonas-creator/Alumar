"use client"

// Toda lógica de migração foi removida - app usa apenas Supabase

export async function migrateLocalStorageToSupabase(): Promise<{
  machinesMigrated: boolean
  historyMigrated: boolean
}> {
  return { machinesMigrated: false, historyMigrated: false }
}

export function isMigrationDone(): boolean {
  return true
}
