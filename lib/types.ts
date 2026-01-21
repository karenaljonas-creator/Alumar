export type MachineStatus = "operacional" | "parada" | "manutencao"
export type AcaoResponsavel = "Vale" | "Atlas" | "Outro"
export type StatusPreventiva = "OK" | "Em Planejamento" | "Em Atraso"

export interface Machine {
  id: string
  nome: string // TAG
  tipo: string // Modelo
  numeroSerie?: string // Adicionando número de série
  data: string
  status: MachineStatus
  motivoParada?: string
  descricaoDetalhada?: string
  acaoResponsavel?: AcaoResponsavel
  dataParada?: string // data em que a máquina parou
  statusPreventiva?: StatusPreventiva
  dataPreventiva?: string
  manutencaoPreventiva?: string
  localizacao: string
  temContrato?: boolean // Adicionando campo para indicar se máquina tem contrato
  contratoConfig?: ContratoConfig // Adicionando configuração do contrato
  responsavel?: string // Adicionando responsável
  tempoParada?: number // Adicionando tempo de parada em dias
}

export interface MachineStats {
  total: number
  operacionais: number
  paradas: number
  manutencao: number
  disponibilidade: number
  disponibilidadeContrato: number // Disponibilidade considerando apenas paradas Atlas
  paradasVale: number
  paradasAtlas: number
  comContrato?: number
  semContrato?: number
}

export interface WeeklySnapshot {
  id: string
  semana: string // formato: "2025-W03" (ano-semana)
  dataRegistro: string // data completa do registro
  stats: MachineStats
  machines: Machine[] // Adding full machines array for filtering
  maquinasParadas: {
    id: string
    nome: string
    tipo: string
    motivoParada: string
    localizacao: string
  }[]
}

export interface HistoryTrend {
  semana: string
  total: number
  operacionais: number
  paradas: number
  manutencao: number
  disponibilidade: number
}

export interface PeriodoInoperante {
  faixa: string
  quantidade: number
  maquinas: string[]
}

export interface AnalysisGroup {
  nome: string
  quantidade: number
  maquinas: string[]
}

export interface ContratoConfig {
  numero: string
  dataInicio: string
  dataFim: string
  fiscal: string
  gestora: string
  localizacao: string
}

export interface RegistroSemanal {
  id: string
  semana: string
  dataRegistro: string
  maquinas: Machine[]
}
