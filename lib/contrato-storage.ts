"use client"

import type { ContratoConfig } from "./types"
import { createClient } from "./supabase/client"

function getSupabaseClient() {
  const client = createClient()
  if (!client) {
    throw new Error("Supabase não está disponível")
  }
  return client
}

export async function saveContrato(config: ContratoConfig): Promise<void> {
  const supabase = getSupabaseClient()

  const { error } = await supabase.from("contratos").upsert(
    {
      numero: config.numero,
      data_inicio: config.dataInicio,
      data_fim: config.dataFim,
      fiscal: config.fiscal,
      gestora: config.gestora,
      localizacao: config.localizacao,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "numero",
    },
  )

  if (error) {
    throw new Error(`Erro ao salvar contrato: ${error.message}`)
  }
}

export function loadContrato(): ContratoConfig {
  return {
    numero: "5900119505",
    dataInicio: "2024-09-14",
    dataFim: "2027-09-13",
    fiscal: "João Silva",
    gestora: "Maria Santos",
    localizacao: "Mina de Salobo - PA",
  }
}

export async function loadContratoAsync(): Promise<ContratoConfig> {
  try {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from("contratos")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      const defaultConfig = loadContrato()
      await saveContrato(defaultConfig)
      return defaultConfig
    }

    return {
      numero: data.numero,
      dataInicio: data.data_inicio,
      dataFim: data.data_fim,
      fiscal: data.fiscal,
      gestora: data.gestora,
      localizacao: data.localizacao,
    }
  } catch (error) {
    console.error("Erro ao carregar contrato:", error)
    return loadContrato()
  }
}
