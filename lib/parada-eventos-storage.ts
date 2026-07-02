"use client"

import type { Machine, ParadaEvento, ParadaEtapa, ParadaIndicadores } from "./types"
import { createClient } from "./supabase/client"
import { loadContrato } from "./contrato-storage"

function getSupabaseClient() {
  const client = createClient()
  if (!client) {
    throw new Error("Supabase não está disponível. Verifique se a instância está ativa.")
  }
  return client
}

function getCurrentContractId(): string {
  return loadContrato().numero
}

function mapRow(row: any): ParadaEvento {
  return {
    id: row.id,
    machineId: row.machine_id,
    machineTag: row.machine_tag,
    contrato: row.contrato ?? undefined,
    categoria: row.categoria ?? undefined,
    acao: row.acao ?? undefined,
    responsavel: row.responsavel ?? undefined,
    observacao: row.observacao ?? undefined,
    prazo: row.prazo ?? undefined,
    dataEvento: row.data_evento,
    createdAt: row.created_at ?? undefined,
  }
}

// Carrega todos os eventos do contrato atual (ordenados cronologicamente).
export async function loadParadaEventos(): Promise<ParadaEvento[]> {
  const supabase = getSupabaseClient()
  const contractId = getCurrentContractId()

  const { data, error } = await supabase
    .from("parada_eventos")
    .select("*")
    .eq("contrato", contractId)
    .order("data_evento", { ascending: true })
    .limit(5000)

  if (error) {
    console.error("[v0] Erro ao carregar eventos de parada:", error)
    throw new Error(`Erro ao carregar histórico de paradas: ${error.message}`)
  }

  return (data || []).map(mapRow)
}

// Registra um novo evento imutável no histórico da máquina.
export async function logParadaEvento(
  machine: Machine,
  dataEvento?: string,
): Promise<ParadaEvento> {
  const supabase = getSupabaseClient()
  const contractId = getCurrentContractId()

  const record = {
    machine_id: machine.id,
    machine_tag: machine.nome,
    contrato: contractId,
    categoria: machine.categoriaParada ?? null,
    acao: machine.acaoResponsavel ?? null,
    responsavel: machine.responsavel ?? null,
    observacao: machine.motivoParada ?? null,
    prazo: machine.prazoDados ?? null,
    data_evento: dataEvento || new Date().toISOString(),
  }

  const { data, error } = await supabase.from("parada_eventos").insert(record).select().single()

  if (error) {
    console.error("[v0] Erro ao registrar evento de parada:", error)
    throw new Error(`Erro ao registrar evento: ${error.message}`)
  }

  return mapRow(data)
}

// Campos monitorados: qualquer mudança neles gera um novo evento.
const CAMPOS_MONITORADOS: (keyof Machine)[] = [
  "categoriaParada",
  "acaoResponsavel",
  "responsavel",
  "motivoParada",
  "prazoDados",
]

// Verifica se houve mudança relevante entre dois estados da máquina.
export function houveMudancaRelevante(anterior: Machine, atual: Machine): boolean {
  return CAMPOS_MONITORADOS.some((campo) => (anterior[campo] ?? "") !== (atual[campo] ?? ""))
}

function diffDias(inicio: string, fim: string): number {
  const a = new Date(inicio).getTime()
  const b = new Date(fim).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return 0
  return Math.max(0, Math.ceil((b - a) / (1000 * 60 * 60 * 24)))
}

// Constrói a linha do tempo e os indicadores a partir dos eventos da máquina.
// Se não houver eventos, gera uma etapa sintética a partir do estado atual da máquina.
export function computeIndicadores(
  eventos: ParadaEvento[],
  machine: Machine,
  now: Date = new Date(),
): ParadaIndicadores {
  const nowIso = now.toISOString()

  let ordered = [...eventos].sort(
    (a, b) => new Date(a.dataEvento).getTime() - new Date(b.dataEvento).getTime(),
  )

  // Fallback: nenhuma alteração registrada ainda -> usa o estado atual como etapa única.
  if (ordered.length === 0) {
    const inicio = machine.dataParada
      ? new Date(machine.dataParada).toISOString()
      : machine.updated_at || nowIso
    ordered = [
      {
        id: "sintetico",
        machineId: machine.id,
        machineTag: machine.nome,
        categoria: machine.categoriaParada,
        acao: machine.acaoResponsavel,
        responsavel: machine.responsavel,
        observacao: machine.motivoParada,
        prazo: machine.prazoDados,
        dataEvento: inicio,
      },
    ]
  }

  const etapas: ParadaEtapa[] = ordered.map((evento, i) => {
    const dataInicio = evento.dataEvento
    const dataFim = i < ordered.length - 1 ? ordered[i + 1].dataEvento : null
    const dias = dataFim ? diffDias(dataInicio, dataFim) : diffDias(dataInicio, nowIso)
    return {
      evento,
      dataInicio,
      dataFim,
      dias,
      atual: dataFim === null,
    }
  })

  const diasTotais = etapas.reduce((acc, e) => acc + e.dias, 0)

  // Agrupamento por categoria
  const catMap = new Map<string, number>()
  const respMap = new Map<string, number>()
  etapas.forEach((e) => {
    const cat = e.evento.categoria || "Sem categoria"
    catMap.set(cat, (catMap.get(cat) || 0) + e.dias)
    const resp = e.evento.acao || "Não definido"
    respMap.set(resp, (respMap.get(resp) || 0) + e.dias)
  })

  const toPct = (dias: number) => (diasTotais > 0 ? Math.round((dias / diasTotais) * 100) : 0)

  const porCategoria = Array.from(catMap.entries())
    .map(([nome, dias]) => ({ nome, dias, percentual: toPct(dias) }))
    .sort((a, b) => b.dias - a.dias)

  const porResponsavel = Array.from(respMap.entries())
    .map(([nome, dias]) => ({ nome, dias, percentual: toPct(dias) }))
    .sort((a, b) => b.dias - a.dias)

  // Tempo na categoria atual: soma das etapas finais consecutivas com a mesma categoria.
  const categoriaAtual = etapas[etapas.length - 1]?.evento.categoria
  let diasNaCategoriaAtual = 0
  for (let i = etapas.length - 1; i >= 0; i--) {
    if ((etapas[i].evento.categoria || "") === (categoriaAtual || "")) {
      diasNaCategoriaAtual += etapas[i].dias
    } else {
      break
    }
  }

  const totalMudancas = Math.max(0, ordered.length - 1)
  const ultimaAlteracao = ordered[ordered.length - 1]?.dataEvento

  return {
    diasTotais,
    categoriaAtual,
    diasNaCategoriaAtual,
    etapas,
    porCategoria,
    porResponsavel,
    totalMudancas,
    ultimaAlteracao,
  }
}
