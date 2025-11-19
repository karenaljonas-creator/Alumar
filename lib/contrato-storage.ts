"use client"

import type { ContratoConfig } from "./types"

const CONTRATO_KEY = "gestao-maquinas-contrato"

export function saveContrato(config: ContratoConfig): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(CONTRATO_KEY, JSON.stringify(config))
  }
}

export function loadContrato(): ContratoConfig {
  if (typeof window !== "undefined") {
    const data = localStorage.getItem(CONTRATO_KEY)
    if (data) {
      return JSON.parse(data)
    }
  }
  return {
    numero: "CT-2025-001",
    dataInicio: "2025-01-01",
    dataFim: "2025-12-31",
    fiscal: "João Silva",
    gestora: "Maria Santos",
    localizacao: "Mina de Salobo - PA",
  }
}
