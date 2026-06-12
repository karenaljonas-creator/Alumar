// Types for ALUMAR Machine Management System

export type MachineStatus = "operando" | "parada" | "manutencao"
export type StopType = "programada" | "nao-programada"
export type MaintenanceType = "preventiva" | "corretiva"

export interface Machine {
  id: string
  name: string
  model: string
  area: string
  serialNumber: string
  tag: string
  inContract: boolean
  status: MachineStatus
  hoursWorked: number
  hoursAvailable: number
  nextMaintenance: string
  lastMaintenance: string
  maintenanceInterval: number
  createdAt: string
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
