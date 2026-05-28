"use client"

import { useState, useCallback, useEffect } from "react"
import type { Machine } from "@/lib/types"

interface UseSyncedMachinesReturn {
  allMachines: Machine[]
  paradasMachines: Machine[]
  updateMachine: (machineId: string, updates: Partial<Machine>) => void
  updateMultipleMachines: (updates: Record<string, Partial<Machine>>) => void
  isLoading: boolean
}

/**
 * Hook que mantém sincronização bidirecional entre:
 * - RegistroSemanal (todas as máquinas)
 * - GestaoParadas (apenas máquinas com status "parada")
 * 
 * Qualquer alteração em um componente atualiza ambos automaticamente.
 */
export function useSyncedMachines(initialMachines: Machine[]): UseSyncedMachinesReturn {
  const [allMachines, setAllMachines] = useState<Machine[]>(initialMachines)
  const [isLoading, setIsLoading] = useState(false)

  // Sincronizar com o estado inicial quando props mudam
  useEffect(() => {
    setAllMachines(initialMachines)
  }, [initialMachines])

  // Filtrar apenas máquinas paradas
  const paradasMachines = allMachines.filter((m) => m.status === "parada" || m.status === "v0")

  // Atualizar uma máquina única
  const updateMachine = useCallback(
    (machineId: string, updates: Partial<Machine>) => {
      setAllMachines((prev) =>
        prev.map((machine) =>
          machine.id === machineId
            ? { ...machine, ...updates, updated_at: new Date().toISOString() }
            : machine
        )
      )
    },
    []
  )

  // Atualizar múltiplas máquinas
  const updateMultipleMachines = useCallback((updates: Record<string, Partial<Machine>>) => {
    setAllMachines((prev) =>
      prev.map((machine) =>
        updates[machine.id]
          ? { ...machine, ...updates[machine.id], updated_at: new Date().toISOString() }
          : machine
      )
    )
  }, [])

  return {
    allMachines,
    paradasMachines,
    updateMachine,
    updateMultipleMachines,
    isLoading,
  }
}
