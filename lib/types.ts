// Types for ALUMAR Machine Management System

export type MachineStatus = "operando" | "parada" | "manutencao"
export type StopType = "programada" | "nao-programada"
export type MaintenanceType = "preventiva" | "corretiva"

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
  name: string
  model: string
  area: string
  serialNumber: string
  tag: string
  inContract: boolean
  status: MachineStatus
<<<<<<< HEAD
  hoursWorked: number
  hoursAvailable: number
  nextMaintenance: string
  lastMaintenance: string
  maintenanceInterval: number
  createdAt: string
=======
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
>>>>>>> origin/main
}

export interface WeeklyRecord {
  id: string
  machineId: string
  machineName: string
  weekStart: string
  weekEnd: string
  hoursWorked: number
  hoursAvailable: number
  availability: number
  observations: string
  createdAt: string
}

export interface Stop {
  id: string
  machineId: string
  machineName: string
  type: StopType
  reason: string
  startDate: string
  endDate: string | null
  duration: number | null
  resolved: boolean
  createdAt: string
}

export interface MaintenanceRecord {
  id: string
  machineId: string
  machineName: string
  type: MaintenanceType
  description: string
  date: string
  hoursAtMaintenance: number
  technician: string
  createdAt: string
}

export interface Settings {
  clientName: string
  contractNumber: string
  location: string
  targetAvailability: number
  weekStartDay: 0 | 1 | 2 | 3 | 4 | 5 | 6
}

export interface DashboardStats {
  totalMachines: number
  operatingMachines: number
  stoppedMachines: number
  inContractMachines: number
  outOfContractMachines: number
  averageAvailability: number
  targetAvailability: number
  pendingMaintenances: number
  activeStops: number
}

export interface WeeklyChartData {
  week: string
  availability: number
  target: number
}

export interface StopAnalysis {
  reason: string
  count: number
  totalHours: number
  percentage: number
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
