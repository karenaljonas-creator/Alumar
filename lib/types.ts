export type MachineStatus = "operacional" | "parada" | "manutencao" | "v0"
export type AcaoResponsavel = "Vale" | "Atlas" | "Outro"
export type StatusPreventiva = "OK" | "Em Planejamento" | "Em Atraso"

export type CategoriaParada =
  | "Aguardando Peça"
  | "Aguardando Cliente"
  | "Aguardando Programação / Recurso"
  | "Instalação / Start-up"
  | "Manutenção Corretiva"
  | "Melhoria / Engenharia"
  | "Logística / Transporte"
  | "Em execução"
  | "Programado"

export const CATEGORIAS_PARADA: CategoriaParada[] = [
  "Aguardando Peça",
  "Aguardando Cliente",
  "Aguardando Programação / Recurso",
  "Instalação / Start-up",
  "Manutenção Corretiva",
  "Melhoria / Engenharia",
  "Logística / Transporte",
  "Em execução",
  "Programado",
]

export interface Machine {
  id: string
  nome: string // TAG
  tipo: string // Modelo
  numeroSerie?: string // Adicionando número de série
  data: string
  status: MachineStatus
  categoriaParada?: CategoriaParada // Categoria da parada (preenchida quando status = parada)
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
  prazoDados?: string // Data do prazo (formato yyyy-MM-dd)
  updated_at?: string // Data da última atualização
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

// Evento imutável do histórico de uma máquina parada.
// Cada mudança em categoria / ação / responsável / observação / prazo gera um novo evento.
export interface ParadaEvento {
  id: string
  machineId: string
  machineTag: string
  contrato?: string
  categoria?: string
  acao?: string
  responsavel?: string
  observacao?: string
  prazo?: string
  dataEvento: string // ISO - momento em que este estado passou a valer
  createdAt?: string
}

// Etapa consolidada da linha do tempo (evento + duração calculada).
export interface ParadaEtapa {
  evento: ParadaEvento
  dataInicio: string
  dataFim: string | null // null = etapa atual (em andamento)
  dias: number
  atual: boolean
}

// Indicadores calculados a partir do histórico de uma máquina.
export interface ParadaIndicadores {
  diasTotais: number
  categoriaAtual?: string
  diasNaCategoriaAtual: number
  etapas: ParadaEtapa[]
  porCategoria: { nome: string; dias: number; percentual: number }[]
  porResponsavel: { nome: string; dias: number; percentual: number }[]
  totalMudancas: number
  ultimaAlteracao?: string
}
