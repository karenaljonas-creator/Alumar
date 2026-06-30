"use client"

import type { Machine } from "./types"
import { createClient } from "./supabase/client"
import { loadRealData } from "./dados-reais"
import { loadContrato } from "./contrato-storage"
import { buildCsv, downloadCsv, detectCsvDelimiter, parseCsvLine, type CsvCell } from "./utils"

// Helper to safely get Supabase client - throws if unavailable
function getSupabaseClient() {
  const client = createClient()
  if (!client) {
    throw new Error("Supabase não está disponível. Verifique se a instância está ativa.")
  }
  return client
}

function getCurrentContractId(): string {
  const contrato = loadContrato()
  return contrato.numero
}

export async function saveMachines(machines: Machine[]): Promise<void> {
  const supabase = getSupabaseClient()

  const contractId = getCurrentContractId()

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
    contrato: contractId,
    observacoes: JSON.stringify({
      motivoParada: m.motivoParada,
      descricaoDetalhada: m.descricaoDetalhada,
      statusPreventiva: m.statusPreventiva,
      manutencaoPreventiva: m.manutencaoPreventiva,
      responsavel: m.responsavel,
      temContrato: m.temContrato,
      numeroSerie: m.numeroSerie,
      prazoDados: m.prazoDados,
      categoriaParada: m.categoriaParada,
    }),
    acao_responsavel: m.acaoResponsavel || null,
    updated_at: m.updated_at || new Date().toISOString(),
  }))

  const { error } = await supabase.from("machines").upsert(records, {
    onConflict: "id",
  })

  if (error) {
    console.error("Erro ao salvar máquinas:", error)
    throw new Error(`Erro ao salvar máquinas: ${error.message}`)
  }
}

export async function loadMachines(): Promise<Machine[]> {
  try {
    const supabase = getSupabaseClient()
    const contractId = getCurrentContractId()

    const { data, error } = await supabase
      .from("machines")
      .select("*")
      .eq("contrato", contractId)
      .order("id", { ascending: true })
      .limit(500)

    if (error) {
      throw new Error(`Erro ao carregar máquinas: ${error.message}`)
    }

    if (!data || data.length === 0) {
      const realData = loadRealData()
      await saveMachines(realData.machines)
      return realData.machines
    }

    const machines: Machine[] = data.map((row) => {
      let parsedData: any = {}
      try {
        if (row.observacoes) {
          parsedData = JSON.parse(row.observacoes)
        }
      } catch (e) {
        parsedData = { motivoParada: row.observacoes }
      }

      return {
        id: row.id,
        nome: row.modelo,
        tipo: row.tipo_equipamento,
        numeroSerie: parsedData.numeroSerie || row.id,
        data: new Date().toISOString().split("T")[0],
        dataParada: row.data_ultima_manutencao?.split("T")[0],
        status: row.status_operacional as Machine["status"],
        categoriaParada: parsedData.categoriaParada || undefined,
        motivoParada: parsedData.motivoParada || undefined,
        manutencaoPreventiva: parsedData.manutencaoPreventiva || undefined,
        localizacao: row.localizacao,
        acaoResponsavel: row.acao_responsavel || undefined,
        statusPreventiva: parsedData.statusPreventiva || "OK",
        descricaoDetalhada: parsedData.descricaoDetalhada || undefined,
        temContrato: parsedData.temContrato !== undefined ? parsedData.temContrato : true,
        responsavel: parsedData.responsavel || row.acao_responsavel || undefined,
        tempoParada: row.horas_operacao || 0,
        prazoDados: parsedData.prazoDados || undefined,
        updated_at: row.updated_at || undefined,
      }
    })

    return machines
  } catch (error) {
    console.error("Erro ao carregar máquinas:", error)
    throw error
  }
}

export async function updateMachine(id: string, updates: Partial<Machine>): Promise<void> {
  const supabase = getSupabaseClient()

  const { data: currentData, error: fetchError } = await supabase
    .from("machines")
    .select("observacoes")
    .eq("id", id)
    .single()

  if (fetchError) {
    console.error("Erro ao buscar máquina para atualização:", fetchError)
    throw new Error(`Erro ao buscar máquina: ${fetchError.message}`)
  }

  let currentObservacoes: any = {}
  try {
    if (currentData?.observacoes) {
      currentObservacoes = JSON.parse(currentData.observacoes)
    }
  } catch (e) {
    // ignore parse error
  }

  const record: any = {}
  if (updates.nome) record.modelo = updates.nome
  if (updates.localizacao) record.localizacao = updates.localizacao
  if (updates.status) record.status_operacional = updates.status
  if (updates.tipo) record.tipo_equipamento = updates.tipo

  if (
    updates.motivoParada ||
    updates.descricaoDetalhada ||
    updates.statusPreventiva ||
    updates.manutencaoPreventiva ||
    updates.responsavel ||
    updates.categoriaParada !== undefined ||
    updates.temContrato !== undefined
  ) {
    record.observacoes = JSON.stringify({
      ...currentObservacoes,
      ...(updates.motivoParada !== undefined && { motivoParada: updates.motivoParada }),
      ...(updates.descricaoDetalhada !== undefined && { descricaoDetalhada: updates.descricaoDetalhada }),
      ...(updates.statusPreventiva !== undefined && { statusPreventiva: updates.statusPreventiva }),
      ...(updates.manutencaoPreventiva !== undefined && { manutencaoPreventiva: updates.manutencaoPreventiva }),
      ...(updates.responsavel !== undefined && { responsavel: updates.responsavel }),
      ...(updates.categoriaParada !== undefined && { categoriaParada: updates.categoriaParada }),
      ...(updates.temContrato !== undefined && { temContrato: updates.temContrato }),
    })
  }

  if (updates.acaoResponsavel !== undefined) record.acao_responsavel = updates.acaoResponsavel
  if (updates.tempoParada !== undefined) record.horas_operacao = updates.tempoParada
  record.updated_at = new Date().toISOString()

  const { error } = await supabase.from("machines").update(record).eq("id", id)

  if (error) {
    console.error("Erro ao atualizar máquina:", error)
    throw new Error(`Erro ao atualizar máquina: ${error.message}`)
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
  const rows: CsvCell[][] = machines.map((m) => [
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

  return buildCsv(headers, rows)
}

export function downloadCSV(machines: Machine[]): void {
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
  const rows: CsvCell[][] = machines.map((m) => [
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
  downloadCsv(`maquinas-${new Date().toISOString().split("T")[0]}.csv`, headers, rows)
}

export async function importFromCSV(csvContent: string): Promise<Machine[]> {
  // Remove BOM UTF-8 se presente
  const content = csvContent.replace(/^\uFEFF/, "")
  const lines = content.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) return []

  // Detecta o delimitador a partir do cabeçalho (";" do Excel pt-BR ou ",")
  const delimiter = detectCsvDelimiter(lines[0])

  const machines: Machine[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i], delimiter)
    if (values && values.length >= 15) {
      machines.push({
        id: values[0],
        nome: values[1],
        tipo: values[2],
        numeroSerie: values[3],
        data: values[4],
        dataParada: values[5],
        status: values[6] as Machine["status"],
        motivoParada: values[7] || undefined,
        manutencaoPreventiva: values[8] || undefined,
        localizacao: values[9],
        acaoResponsavel: (values[10] || undefined) as Machine["acaoResponsavel"],
        statusPreventiva: (values[11] || "OK") as Machine["statusPreventiva"],
        descricaoDetalhada: values[12] || undefined,
        temContrato: (values[13] || "").toLowerCase() === "sim",
        responsavel: values[14] || undefined,
        tempoParada: Number((values[15] || "").replace(",", ".")) || 0,
      })
    }
  }

  if (machines.length > 0) {
    await saveMachines(machines)
  }

  return machines
}
