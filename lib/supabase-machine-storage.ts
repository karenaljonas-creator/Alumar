"use client"

import type { Machine } from "./types"
import { createClient } from "./supabase/client"
import { loadRealData } from "./dados-reais"

const CONTRACT_ID = "5900119505"

function getSupabaseClient() {
  return createClient()
}

export async function saveMachines(machines: Machine[]): Promise<void> {
  const supabase = getSupabaseClient()

  const records = machines.map((m) => ({
    id: m.id,
    modelo: m.nome,
    localizacao: m.localizacao,
    status_operacional: m.status,
    tipo_equipamento: m.tipo,
    pressao_trabalho: 0,
    vazao: 0,
    potencia_motor: 0,
    horas_operacao: m.tempoParada || 0,
    data_ultima_manutencao: m.dataParada ? new Date(m.dataParada).toISOString() : null,
    proxima_manutencao: null,
    contrato: CONTRACT_ID,
    observacoes: m.motivoParada || m.descricaoDetalhada || null,
    acao_responsavel: m.acaoResponsavel || null,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase.from("machines").upsert(records, {
    onConflict: "id",
  })

  if (error) {
    throw error
  }
}

export async function loadMachines(): Promise<Machine[]> {
  try {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase.from("machines").select("*").eq("contrato", CONTRACT_ID)

    if (error) {
      const realData = loadRealData()
      return realData.machines
    }

    if (!data || data.length === 0) {
      const realData = loadRealData()
      try {
        await saveMachines(realData.machines)
      } catch (saveError) {
        // Ignorar erro de salvamento inicial
      }
      return realData.machines
    }

    // Converter do formato do banco para o formato da aplicação
    const machines: Machine[] = data.map((row) => ({
      id: row.id,
      nome: row.modelo,
      tipo: row.tipo_equipamento,
      numeroSerie: row.id,
      data: new Date().toISOString().split("T")[0],
      dataParada: row.data_ultima_manutencao?.split("T")[0],
      status: row.status_operacional as Machine["status"],
      motivoParada: row.observacoes || undefined,
      manutencaoPreventiva: undefined,
      localizacao: row.localizacao,
      acaoResponsavel: row.acao_responsavel || undefined,
      statusPreventiva: undefined,
      descricaoDetalhada: row.observacoes || undefined,
      temContrato: true,
      responsavel: undefined,
      tempoParada: row.horas_operacao || 0,
    }))

    return machines
  } catch (error) {
    const realData = loadRealData()
    return realData.machines
  }
}

export async function updateMachine(id: string, updates: Partial<Machine>): Promise<void> {
  const supabase = getSupabaseClient()

  const record: any = {}
  if (updates.nome) record.modelo = updates.nome
  if (updates.localizacao) record.localizacao = updates.localizacao
  if (updates.status) record.status_operacional = updates.status
  if (updates.tipo) record.tipo_equipamento = updates.tipo
  if (updates.motivoParada) record.observacoes = updates.motivoParada
  if (updates.acaoResponsavel !== undefined) record.acao_responsavel = updates.acaoResponsavel
  if (updates.tempoParada !== undefined) record.horas_operacao = updates.tempoParada
  record.updated_at = new Date().toISOString()

  const { error } = await supabase.from("machines").update(record).eq("id", id)

  if (error) {
    throw error
  }
}

export function exportToCSV(machines: Machine[]): string {
  const headers = [
    "ID",
    "Máquina",
    "Tipo",
    "Número de Série",
    "Data",
    "Status",
    "Motivo da Parada",
    "Manutenção Preventiva",
    "Localização",
    "Ação Responsável",
    "Status Preventiva",
    "Descrição Detalhada",
    "Tem Contrato",
    "Responsável",
    "Tempo de Parada",
  ]
  const rows = machines.map((m) => [
    m.id,
    m.nome,
    m.tipo,
    m.numeroSerie || "",
    m.data,
    m.status,
    m.motivoParada || "",
    m.manutencaoPreventiva || "",
    m.localizacao,
    m.acaoResponsavel || "",
    m.statusPreventiva || "",
    m.descricaoDetalhada || "",
    m.temContrato ? "Sim" : "Não",
    m.responsavel || "",
    m.tempoParada || 0,
  ])

  const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n")

  return csvContent
}

export function downloadCSV(machines: Machine[]): void {
  const csv = exportToCSV(machines)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)

  link.setAttribute("href", url)
  link.setAttribute("download", `maquinas-${new Date().toISOString().split("T")[0]}.csv`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export async function importFromCSV(csvContent: string): Promise<Machine[]> {
  const lines = csvContent.split("\n").filter((line) => line.trim())
  if (lines.length < 2) return []

  const machines: Machine[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g)
    if (values && values.length >= 15) {
      machines.push({
        id: values[0].replace(/"/g, ""),
        nome: values[1].replace(/"/g, ""),
        tipo: values[2].replace(/"/g, ""),
        numeroSerie: values[3].replace(/"/g, ""),
        data: values[4].replace(/"/g, ""),
        dataParada: values[5].replace(/"/g, ""),
        status: values[6].replace(/"/g, "") as Machine["status"],
        motivoParada: values[7].replace(/"/g, "") || undefined,
        manutencaoPreventiva: values[8].replace(/"/g, "") || undefined,
        localizacao: values[9].replace(/"/g, ""),
        acaoResponsavel: values[10].replace(/"/g, "") || undefined,
        statusPreventiva: values[11].replace(/"/g, "") || undefined,
        descricaoDetalhada: values[12].replace(/"/g, "") || undefined,
        temContrato: values[13].replace(/"/g, "").toLowerCase() === "sim",
        responsavel: values[14].replace(/"/g, "") || undefined,
        tempoParada: Number(values[15].replace(/"/g, "")) || 0,
      })
    }
  }

  // Salvar as máquinas importadas no Supabase
  if (machines.length > 0) {
    await saveMachines(machines)
  }

  return machines
}
