"use client"

import type { Machine, ParadaEvento, ParadaEtapa, ParadaIndicadores, RegistroSemanal } from "./types"
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

// Estado consolidado num instante do tempo (vindo de um registro semanal,
// de um evento ao vivo ou do estado atual da máquina).
interface EstadoSnapshot {
  data: string
  categoria?: string
  acao?: string
  responsavel?: string
  observacao?: string
  prazo?: string
}

// Duas etapas só são a mesma se categoria + ação + responsável forem iguais.
function mesmaEtapa(a: EstadoSnapshot, b: EstadoSnapshot): boolean {
  return (
    (a.categoria ?? "") === (b.categoria ?? "") &&
    (a.acao ?? "") === (b.acao ?? "") &&
    (a.responsavel ?? "") === (b.responsavel ?? "")
  )
}

// Constrói a linha do tempo e os indicadores combinando:
// 1) o histórico dos registros semanais (fonte real do passado)
// 2) os eventos ao vivo registrados na tela de Paradas
// 3) o estado atual da máquina (garante a etapa atual correta)
export function computeIndicadores(
  eventos: ParadaEvento[],
  machine: Machine,
  registros: RegistroSemanal[] = [],
  now: Date = new Date(),
): ParadaIndicadores {
  const nowIso = now.toISOString()

  const snapshots: EstadoSnapshot[] = []

  // 1) Registros semanais que contêm esta máquina
  for (const reg of registros) {
    const m = reg.maquinas.find((x) => x.id === machine.id)
    if (!m) continue
    snapshots.push({
      data: new Date(reg.dataRegistro).toISOString(),
      categoria: (m as any).categoriaParada,
      acao: m.acaoResponsavel,
      responsavel: m.responsavel,
      observacao: m.motivoParada,
      prazo: (m as any).prazoDados,
    })
  }

  // 2) Eventos ao vivo
  for (const ev of eventos) {
    snapshots.push({
      data: new Date(ev.dataEvento).toISOString(),
      categoria: ev.categoria,
      acao: ev.acao,
      responsavel: ev.responsavel,
      observacao: ev.observacao,
      prazo: ev.prazo,
    })
  }

  // 3) Estado atual da máquina
  snapshots.push({
    data: machine.updated_at ? new Date(machine.updated_at).toISOString() : nowIso,
    categoria: machine.categoriaParada,
    acao: machine.acaoResponsavel,
    responsavel: machine.responsavel,
    observacao: machine.motivoParada,
    prazo: machine.prazoDados,
  })

  // Ordena cronologicamente
  snapshots.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())

  // Ancora o início da linha do tempo na data real da parada
  const inicioParada = machine.dataParada
    ? new Date(machine.dataParada).toISOString()
    : snapshots[0]?.data ?? nowIso
  if (snapshots.length > 0) {
    snapshots[0] = { ...snapshots[0], data: inicioParada }
  }

  // Colapsa snapshots consecutivos que representam a mesma etapa
  const colapsados: EstadoSnapshot[] = []
  for (const s of snapshots) {
    const ultimo = colapsados[colapsados.length - 1]
    if (ultimo && mesmaEtapa(ultimo, s)) {
      // mantém a observação mais recente dentro da mesma etapa
      if (s.observacao) ultimo.observacao = s.observacao
      if (s.prazo) ultimo.prazo = s.prazo
      continue
    }
    colapsados.push({ ...s })
  }

  const ordered: ParadaEvento[] = colapsados.map((s, i) => ({
    id: `etapa-${i}`,
    machineId: machine.id,
    machineTag: machine.nome,
    categoria: s.categoria,
    acao: s.acao,
    responsavel: s.responsavel,
    observacao: s.observacao,
    prazo: s.prazo,
    dataEvento: s.data,
  }))

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
