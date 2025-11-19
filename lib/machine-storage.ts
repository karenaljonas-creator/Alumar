"use client"

import type { Machine } from "./types"
import { dadosReaisMaquinas, loadRealData } from "./dados-reais"

const STORAGE_KEY = "gestao-maquinas-data"
const STORAGE_VERSION_KEY = "gestao-maquinas-version"
const CURRENT_VERSION = "2" // Incrementar para forçar recarga

export function saveMachines(machines: Machine[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(machines))
    localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_VERSION)
  }
}

export function loadMachines(): Machine[] {
  if (typeof window !== "undefined") {
    const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY)
    const data = localStorage.getItem(STORAGE_KEY)

    if (storedVersion !== CURRENT_VERSION || !data) {
      console.log("[v0] Versão desatualizada ou sem dados - recarregando dados reais")
      const realData = loadRealData()
      saveMachines(realData.machines)
      return realData.machines
    }

    if (data) {
      const machines = JSON.parse(data)
      if (machines.length === 0) {
        const realData = loadRealData()
        saveMachines(realData.machines)
        return realData.machines
      }

      const realData = loadRealData()
      const machinesMap = new Map(realData.machines.map((m) => [m.id, m]))

      const updatedMachines = machines.map((machine: Machine) => {
        const realMachine = machinesMap.get(machine.id)
        if (realMachine && machine.status === "parada") {
          // Sempre atualiza o acaoResponsavel das máquinas paradas
          return { ...machine, acaoResponsavel: realMachine.acaoResponsavel }
        }
        return machine
      })

      const paradasComAcao = updatedMachines.filter((m) => m.status === "parada" && m.acaoResponsavel).length
      console.log(`[v0] Máquinas paradas com acaoResponsavel: ${paradasComAcao}`)

      saveMachines(updatedMachines)
      return updatedMachines
    }
  }

  const realData = loadRealData()
  if (typeof window !== "undefined") {
    saveMachines(realData.machines)
  }
  return realData.machines
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

export function importFromCSV(csvContent: string): Machine[] {
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

  return machines
}

function getInitialMachines(): Machine[] {
  return dadosReaisMaquinas.map((maquina) => ({
    id: maquina.id,
    nome: maquina.tag,
    tipo: maquina.tipo,
    numeroSerie: maquina.numeroSerie,
    data: new Date().toISOString().split("T")[0],
    dataParada: maquina.dataParada,
    status:
      maquina.statusOperacional === "Operacional"
        ? "operacional"
        : maquina.statusOperacional === "Parada"
          ? "parada"
          : "manutencao",
    motivoParada: maquina.observacoes || undefined,
    manutencaoPreventiva: maquina.manutencaoPreventiva,
    localizacao: maquina.localizacao,
    acaoResponsavel: maquina.acao || undefined,
    statusPreventiva: maquina.manutencaoPreventiva,
    descricaoDetalhada: maquina.observacoes,
    temContrato: maquina.temContrato,
    responsavel: maquina.responsavel,
    tempoParada: maquina.tempo,
  }))
}
