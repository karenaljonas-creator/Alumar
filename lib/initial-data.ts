import type { Machine, Settings } from "./types"

// Dados baseados na planilha de equipamentos ALUMAR
export const defaultMachines: Machine[] = [
  // Refinaria
  { id: "1", name: "ZR6 111R-CP11", model: "ZR6", area: "Refinaria", serialNumber: "487164", tag: "111R-CP11", inContract: true, status: "operando", hoursWorked: 450, hoursAvailable: 500, nextMaintenance: "2024-02-15", lastMaintenance: "2024-01-15", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "2", name: "ZR6 111R-CP12", model: "ZR6", area: "Refinaria", serialNumber: "487165", tag: "111R-CP12", inContract: true, status: "operando", hoursWorked: 420, hoursAvailable: 500, nextMaintenance: "2024-02-18", lastMaintenance: "2024-01-12", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "3", name: "ZR6 111R-CP13", model: "ZR6", area: "Porto", serialNumber: "487172", tag: "111R-CP13", inContract: true, status: "operando", hoursWorked: 380, hoursAvailable: 500, nextMaintenance: "2024-02-20", lastMaintenance: "2024-01-10", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "4", name: "FD600 110F-SC21", model: "FD600", area: "Refinaria", serialNumber: "AIF116654", tag: "110F-SC21", inContract: true, status: "operando", hoursWorked: 320, hoursAvailable: 500, nextMaintenance: "2024-02-22", lastMaintenance: "2024-01-08", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "5", name: "FD601 110F-SC31", model: "FD601", area: "Refinaria", serialNumber: "AIF116655", tag: "110F-SC31", inContract: true, status: "operando", hoursWorked: 340, hoursAvailable: 500, nextMaintenance: "2024-02-25", lastMaintenance: "2024-01-05", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "6", name: "GA110 7,5-10bar 110F-SP31", model: "GA110 7,5-10bar", area: "Refinaria", serialNumber: "AIF117335", tag: "110F-SP31", inContract: true, status: "operando", hoursWorked: 280, hoursAvailable: 500, nextMaintenance: "2024-02-28", lastMaintenance: "2024-01-18", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "7", name: "GA110 7,5-10bar 110F-SP32", model: "GA110 7,5-10bar", area: "Refinaria", serialNumber: "AIF117336", tag: "110F-SP32", inContract: true, status: "operando", hoursWorked: 290, hoursAvailable: 500, nextMaintenance: "2024-03-01", lastMaintenance: "2024-01-20", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "8", name: "GA110 7,5-10bar 110F-SP21", model: "GA110 7,5-10bar", area: "Refinaria", serialNumber: "AIF117890", tag: "110F-SP21", inContract: true, status: "operando", hoursWorked: 310, hoursAvailable: 500, nextMaintenance: "2024-03-05", lastMaintenance: "2024-01-22", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "9", name: "GA110 7,5-10bar 110F-SP22", model: "GA110 7,5-10bar", area: "Refinaria", serialNumber: "AIF117891", tag: "110F-SP22", inContract: true, status: "operando", hoursWorked: 305, hoursAvailable: 500, nextMaintenance: "2024-03-08", lastMaintenance: "2024-01-25", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "10", name: "FD4000 VSD DESATIVADO", model: "FD4000 VSD", area: "Refinaria", serialNumber: "APF154077", tag: "DESATIVADO", inContract: true, status: "parada", hoursWorked: 0, hoursAvailable: 500, nextMaintenance: "2024-03-10", lastMaintenance: "2024-01-01", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "11", name: "ZR750 111R-CP31", model: "ZR750", area: "Refinaria", serialNumber: "BRP065202", tag: "111R-CP31", inContract: true, status: "operando", hoursWorked: 410, hoursAvailable: 500, nextMaintenance: "2024-02-12", lastMaintenance: "2024-01-14", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "12", name: "GA160 100-150psi(A) 110G-CP50", model: "GA160 100-150psi(A)", area: "Refinaria", serialNumber: "BRP070196", tag: "110G-CP50", inContract: true, status: "operando", hoursWorked: 360, hoursAvailable: 500, nextMaintenance: "2024-02-16", lastMaintenance: "2024-01-16", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "13", name: "F4170W 111R-SC11", model: "F4170W", area: "Refinaria", serialNumber: "COX807393", tag: "111R-SC11", inContract: true, status: "operando", hoursWorked: 390, hoursAvailable: 500, nextMaintenance: "2024-02-19", lastMaintenance: "2024-01-11", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "14", name: "DDp780FPM 110X-FL35", model: "DDp780FPM", area: "Refinaria", serialNumber: "FL117398", tag: "110X-FL35", inContract: true, status: "operando", hoursWorked: 370, hoursAvailable: 500, nextMaintenance: "2024-02-21", lastMaintenance: "2024-01-09", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "15", name: "DDp780FPM 110X-FL25", model: "DDp780FPM", area: "Refinaria", serialNumber: "FL117399", tag: "110X-FL25", inContract: true, status: "operando", hoursWorked: 355, hoursAvailable: 500, nextMaintenance: "2024-02-23", lastMaintenance: "2024-01-07", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "16", name: "DDp780FPM 110X-FL26", model: "DDp780FPM", area: "Refinaria", serialNumber: "FL117741", tag: "110X-FL26", inContract: true, status: "operando", hoursWorked: 345, hoursAvailable: 500, nextMaintenance: "2024-02-26", lastMaintenance: "2024-01-06", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "17", name: "PD780FPM 110X-FL36", model: "PD780FPM", area: "Refinaria", serialNumber: "FL117742", tag: "110X-FL36", inContract: true, status: "operando", hoursWorked: 335, hoursAvailable: 500, nextMaintenance: "2024-02-27", lastMaintenance: "2024-01-04", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  
  // Redução
  { id: "18", name: "FD4000 VSD DESATIVADO", model: "FD4000 VSD", area: "Redução", serialNumber: "APF260228", tag: "DESATIVADO", inContract: true, status: "parada", hoursWorked: 0, hoursAvailable: 500, nextMaintenance: "2024-03-10", lastMaintenance: "2024-01-01", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "19", name: "FD4000 VSD DESATIVADO", model: "FD4000 VSD", area: "Redução", serialNumber: "APF154081", tag: "DESATIVADO", inContract: true, status: "parada", hoursWorked: 0, hoursAvailable: 500, nextMaintenance: "2024-03-10", lastMaintenance: "2024-01-01", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "20", name: "FD4000 VSD DESATIVADO", model: "FD4000 VSD", area: "Redução", serialNumber: "APF154075", tag: "DESATIVADO", inContract: true, status: "parada", hoursWorked: 0, hoursAvailable: 500, nextMaintenance: "2024-03-10", lastMaintenance: "2024-01-01", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "21", name: "FD4000 VSD DESATIVADO", model: "FD4000 VSD", area: "Redução", serialNumber: "APF154073", tag: "DESATIVADO", inContract: true, status: "parada", hoursWorked: 0, hoursAvailable: 500, nextMaintenance: "2024-03-10", lastMaintenance: "2024-01-01", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "22", name: "ZR6 PAU487236", model: "ZR6", area: "Redução", serialNumber: "PAU487236", tag: "DESATIVADO", inContract: true, status: "parada", hoursWorked: 0, hoursAvailable: 500, nextMaintenance: "2024-03-10", lastMaintenance: "2024-01-01", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "23", name: "ZR 750 112S-CP08", model: "ZR 750", area: "Redução", serialNumber: "700061", tag: "112S-CP08", inContract: true, status: "operando", hoursWorked: 420, hoursAvailable: 500, nextMaintenance: "2024-02-14", lastMaintenance: "2024-01-13", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "24", name: "ZR 750 112S-CP05", model: "ZR 750", area: "Redução", serialNumber: "700060", tag: "112S-CP05", inContract: true, status: "operando", hoursWorked: 430, hoursAvailable: 500, nextMaintenance: "2024-02-13", lastMaintenance: "2024-01-12", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "25", name: "ZR 750 112S-CP06", model: "ZR 750", area: "Redução", serialNumber: "700059", tag: "112S-CP06", inContract: true, status: "operando", hoursWorked: 440, hoursAvailable: 500, nextMaintenance: "2024-02-11", lastMaintenance: "2024-01-11", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "26", name: "ZR 750 112S-CP07", model: "ZR 750", area: "Redução", serialNumber: "700062", tag: "112S-CP07", inContract: true, status: "operando", hoursWorked: 425, hoursAvailable: 500, nextMaintenance: "2024-02-15", lastMaintenance: "2024-01-14", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "27", name: "ZR6 111S-CP16", model: "ZR6", area: "Redução", serialNumber: "487234", tag: "111S-CP16", inContract: true, status: "operando", hoursWorked: 400, hoursAvailable: 500, nextMaintenance: "2024-02-17", lastMaintenance: "2024-01-15", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "28", name: "ZR 750 111S-CP11", model: "ZR 750", area: "Redução", serialNumber: "BQR138461", tag: "111S-CP11", inContract: true, status: "operando", hoursWorked: 395, hoursAvailable: 500, nextMaintenance: "2024-02-18", lastMaintenance: "2024-01-16", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "29", name: "ZR 750 111S-CP14", model: "ZR 750", area: "Redução", serialNumber: "BQR138462", tag: "111S-CP14", inContract: true, status: "operando", hoursWorked: 385, hoursAvailable: 500, nextMaintenance: "2024-02-19", lastMaintenance: "2024-01-17", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "30", name: "ZR 750 111S-CP15", model: "ZR 750", area: "Redução", serialNumber: "BQR138459", tag: "111S-CP15", inContract: true, status: "operando", hoursWorked: 375, hoursAvailable: 500, nextMaintenance: "2024-02-20", lastMaintenance: "2024-01-18", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "31", name: "ZR 750 111S-CP17", model: "ZR 750", area: "Redução", serialNumber: "BQR138458", tag: "111S-CP17", inContract: true, status: "operando", hoursWorked: 365, hoursAvailable: 500, nextMaintenance: "2024-02-21", lastMaintenance: "2024-01-19", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "32", name: "FD2400VSD 112S-SC06", model: "FD2400VSD", area: "Redução", serialNumber: "APF157021", tag: "112S-SC06", inContract: true, status: "operando", hoursWorked: 355, hoursAvailable: 500, nextMaintenance: "2024-02-22", lastMaintenance: "2024-01-20", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "33", name: "FD2400VSD 112S-SC07", model: "FD2400VSD", area: "Redução", serialNumber: "APF157020", tag: "112S-SC07", inContract: true, status: "operando", hoursWorked: 345, hoursAvailable: 500, nextMaintenance: "2024-02-23", lastMaintenance: "2024-01-21", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "34", name: "FD2400VSD 112S-SC05", model: "FD2400VSD", area: "Redução", serialNumber: "APF157018", tag: "112S-SC05", inContract: true, status: "operando", hoursWorked: 335, hoursAvailable: 500, nextMaintenance: "2024-02-24", lastMaintenance: "2024-01-22", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "35", name: "ZR750 111S-CP12", model: "ZR750", area: "Redução", serialNumber: "BQR138282", tag: "111S-CP12", inContract: true, status: "operando", hoursWorked: 325, hoursAvailable: 500, nextMaintenance: "2024-02-25", lastMaintenance: "2024-01-23", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  
  // Precipitação
  { id: "36", name: "GA160 045-CP24", model: "GA160", area: "Precipitação", serialNumber: "BRP068398", tag: "045-CP24", inContract: true, status: "operando", hoursWorked: 315, hoursAvailable: 500, nextMaintenance: "2024-02-26", lastMaintenance: "2024-01-24", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "37", name: "ZE 185 045X-CP21", model: "ZE 185", area: "Precipitação", serialNumber: "34665", tag: "045X-CP21", inContract: true, status: "operando", hoursWorked: 305, hoursAvailable: 500, nextMaintenance: "2024-02-27", lastMaintenance: "2024-01-25", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "38", name: "ZE 185 045X-CP22", model: "ZE 185", area: "Precipitação", serialNumber: "34360", tag: "045X-CP22", inContract: true, status: "operando", hoursWorked: 295, hoursAvailable: 500, nextMaintenance: "2024-02-28", lastMaintenance: "2024-01-26", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "39", name: "ZE 185 045X-CP23", model: "ZE 185", area: "Precipitação", serialNumber: "33852", tag: "045X-CP23", inContract: true, status: "operando", hoursWorked: 285, hoursAvailable: 500, nextMaintenance: "2024-03-01", lastMaintenance: "2024-01-27", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  
  // Clarificação
  { id: "40", name: "GA160 FF 005A-CP21", model: "GA160 FF", area: "Clarificação", serialNumber: "BRP068336", tag: "005A-CP21", inContract: true, status: "operando", hoursWorked: 275, hoursAvailable: 500, nextMaintenance: "2024-03-02", lastMaintenance: "2024-01-28", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  
  // Equipamentos FORA de Contrato (NÃO)
  { id: "41", name: "F 4170 SC17 111S", model: "F 4170", area: "Redução", serialNumber: "COX810908", tag: "SC17 111S", inContract: false, status: "operando", hoursWorked: 265, hoursAvailable: 500, nextMaintenance: "2024-03-03", lastMaintenance: "2024-01-29", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "42", name: "F 4170 SC18 111S", model: "F 4170", area: "Redução", serialNumber: "COX810988", tag: "SC18 111S", inContract: false, status: "operando", hoursWorked: 255, hoursAvailable: 500, nextMaintenance: "2024-03-04", lastMaintenance: "2024-01-30", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "43", name: "F 4170 SC16 111S", model: "F 4170", area: "Redução", serialNumber: "COX810989", tag: "SC16 111S", inContract: false, status: "operando", hoursWorked: 245, hoursAvailable: 500, nextMaintenance: "2024-03-05", lastMaintenance: "2024-01-31", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "44", name: "F 4170 SC07 112S", model: "F 4170", area: "Redução", serialNumber: "COX810990", tag: "SC07 112S", inContract: false, status: "operando", hoursWorked: 235, hoursAvailable: 500, nextMaintenance: "2024-03-06", lastMaintenance: "2024-02-01", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "45", name: "F 4170 SC06 112S", model: "F 4170", area: "Redução", serialNumber: "COX810909", tag: "SC06 112S", inContract: false, status: "operando", hoursWorked: 225, hoursAvailable: 500, nextMaintenance: "2024-03-07", lastMaintenance: "2024-02-02", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "46", name: "ZR 750 CP18 111S", model: "ZR 750", area: "Redução", serialNumber: "BQR146107", tag: "CP18 111S", inContract: false, status: "operando", hoursWorked: 215, hoursAvailable: 500, nextMaintenance: "2024-03-08", lastMaintenance: "2024-02-03", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "47", name: "FD4000 VSD DESATIVADO", model: "FD4000 VSD", area: "Refinaria", serialNumber: "APF154077", tag: "DESATIVADO", inContract: true, status: "parada", hoursWorked: 0, hoursAvailable: 500, nextMaintenance: "2024-03-09", lastMaintenance: "2024-01-01", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "48", name: "FD4000 DESATIVADO", model: "FD4000", area: "Refinaria", serialNumber: "APF260228", tag: "DESATIVADO", inContract: true, status: "parada", hoursWorked: 0, hoursAvailable: 500, nextMaintenance: "2024-03-10", lastMaintenance: "2024-01-01", maintenanceInterval: 500, createdAt: "2024-01-01T00:00:00.000Z" },
]

export const defaultSettings: Settings = {
  clientName: "ALUMAR",
  contractNumber: "CT-2024-001",
  location: "São Luís - MA",
  targetAvailability: 92,
  weekStartDay: 0,
}

export const stopReasons = [
  "Falha Mecânica",
  "Falha Elétrica",
  "Falha Hidráulica",
  "Manutenção Preventiva",
  "Manutenção Corretiva",
  "Aguardando Peças",
  "Condições Climáticas",
  "Falta de Operador",
  "Abastecimento",
  "Troca de Turno",
  "Outros",
]

export const machineModels = [
  "ZR6",
  "ZR 750",
  "ZR750",
  "FD600",
  "FD601",
  "FD4000",
  "FD4000 VSD",
  "FD2400VSD",
  "GA110 7,5-10bar",
  "GA160",
  "GA160 FF",
  "GA160 100-150psi(A)",
  "F4170W",
  "F 4170",
  "DDp780FPM",
  "PD780FPM",
  "ZE 185",
  "Outro",
]

export const machineAreas = [
  "Refinaria",
  "Redução",
  "Precipitação",
  "Clarificação",
  "Porto",
  "Outro",
]
