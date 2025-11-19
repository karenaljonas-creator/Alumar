"use client"

import type { RegistroSemanal, Machine } from "./types"
import { criarRegistrosSemanaisReais } from "./dados-reais"

const REGISTRO_KEY = "gestao-maquinas-registros-semanais"

export function saveRegistroSemanal(machines: Machine[]): RegistroSemanal {
  const now = new Date()
  const year = now.getFullYear()
  const weekNumber = getWeekNumber(now)
  const semana = `${year}-W${String(weekNumber).padStart(2, "0")}`

  const registro: RegistroSemanal = {
    id: Date.now().toString(),
    semana,
    dataRegistro: now.toISOString(),
    maquinas: JSON.parse(JSON.stringify(machines)),
  }

  const registros = loadRegistrosSemanais()
  const existingIndex = registros.findIndex((r) => r.semana === semana)
  if (existingIndex >= 0) {
    registros[existingIndex] = registro
  } else {
    registros.push(registro)
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(REGISTRO_KEY, JSON.stringify(registros))
  }

  return registro
}

export function loadRegistrosSemanais(): RegistroSemanal[] {
  if (typeof window !== "undefined") {
    const data = localStorage.getItem(REGISTRO_KEY)
    if (data) {
      return JSON.parse(data)
    }
  }
  return criarRegistrosSemanaisReais()
}

export function getHistoricoMaquina(machineId: string): RegistroSemanal[] {
  const registros = loadRegistrosSemanais()
  return registros.filter((r) => r.maquinas.some((m) => m.id === machineId))
}

export function getRegistroSemanal(semana: string): RegistroSemanal | null {
  const registros = loadRegistrosSemanais()
  return registros.find((r) => r.semana === semana) || null
}

export function deleteRegistro(id: string): void {
  const registros = loadRegistrosSemanais()
  const filtered = registros.filter((r) => r.id !== id)
  if (typeof window !== "undefined") {
    localStorage.setItem(REGISTRO_KEY, JSON.stringify(filtered))
  }
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}
