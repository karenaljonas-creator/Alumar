import type { Machine, MachineStats } from "./types"

export function filtrarMaquinasPrincipais(machines: Machine[]): Machine[] {
  const tiposPrincipais = ["Compressor", "Secador", "Soprador"]
  return machines.filter((m) => tiposPrincipais.includes(m.tipo))
}

export function calculateStats(machines: Machine[]): MachineStats {
  const operacionais = machines.filter((m) => m.status === "operacional").length
  const paradas = machines.filter((m) => m.status === "parada").length
  const manutencao = machines.filter((m) => m.status === "manutencao").length
  const total = machines.length
  const disponibilidade = total > 0 ? (operacionais / total) * 100 : 0
  const comContrato = machines.filter((m) => m.temContrato === true).length
  const semContrato = machines.filter((m) => m.temContrato === false || m.temContrato === undefined).length

  return {
    total,
    operacionais,
    paradas,
    manutencao,
    disponibilidade,
    comContrato,
    semContrato,
  }
}

export function getStatusColor(status: Machine["status"]): string {
  switch (status) {
    case "operacional":
      return "text-success bg-success/10"
    case "parada":
      return "text-destructive bg-destructive/10"
    case "manutencao":
      return "text-warning bg-warning/10"
    default:
      return "text-muted-foreground bg-muted"
  }
}

export function getStatusLabel(status: Machine["status"]): string {
  switch (status) {
    case "operacional":
      return "Operacional"
    case "parada":
      return "Parada"
    case "manutencao":
      return "Manutenção"
    default:
      return status
  }
}

export function calcularDiasParada(dataParada?: string): number {
  if (!dataParada) return 0
  const hoje = new Date()
  const dataInicio = new Date(dataParada)
  const diffTime = Math.abs(hoje.getTime() - dataInicio.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

export function getFaixaPeriodoInoperante(dias: number): string {
  if (dias === 0) return "0 dias"
  if (dias <= 15) return "1-15 dias"
  if (dias <= 30) return "16-30 dias"
  if (dias <= 60) return "31-60 dias"
  if (dias <= 90) return "61-90 dias"
  return "91+ dias"
}

export function analisarPeriodoInoperante(machines: Machine[]) {
  const maquinasParadas = machines.filter((m) => m.status === "parada")
  const grupos: Record<string, { quantidade: number; maquinas: string[] }> = {
    "0-15 dias": { quantidade: 0, maquinas: [] },
    "16-30 dias": { quantidade: 0, maquinas: [] },
    "31-60 dias": { quantidade: 0, maquinas: [] },
    "61-90 dias": { quantidade: 0, maquinas: [] },
    "91+ dias": { quantidade: 0, maquinas: [] },
  }

  maquinasParadas.forEach((m) => {
    const dias = calcularDiasParada(m.dataParada)
    let faixa: string

    if (dias === 0) return
    if (dias <= 15) faixa = "0-15 dias"
    else if (dias <= 30) faixa = "16-30 dias"
    else if (dias <= 60) faixa = "31-60 dias"
    else if (dias <= 90) faixa = "61-90 dias"
    else faixa = "91+ dias"

    if (grupos[faixa]) {
      grupos[faixa].quantidade++
      grupos[faixa].maquinas.push(m.nome)
    }
  })

  return Object.entries(grupos)
    .map(([faixa, data]) => ({
      faixa,
      quantidade: data.quantidade,
      maquinas: data.maquinas,
    }))
    .filter((g) => g.quantidade > 0)
}

export function analisarPorTipo(machines: Machine[]) {
  const grupos: Record<string, { quantidade: number; maquinas: string[] }> = {}

  machines.forEach((m) => {
    if (!grupos[m.tipo]) {
      grupos[m.tipo] = { quantidade: 0, maquinas: [] }
    }
    grupos[m.tipo].quantidade++
    grupos[m.tipo].maquinas.push(m.nome)
  })

  return Object.entries(grupos)
    .map(([nome, data]) => ({
      nome,
      quantidade: data.quantidade,
      maquinas: data.maquinas,
    }))
    .sort((a, b) => b.quantidade - a.quantidade)
}

export function analisarPorLocalizacao(machines: Machine[]) {
  const grupos: Record<string, { quantidade: number; maquinas: string[] }> = {}

  machines.forEach((m) => {
    if (!grupos[m.localizacao]) {
      grupos[m.localizacao] = { quantidade: 0, maquinas: [] }
    }
    grupos[m.localizacao].quantidade++
    grupos[m.localizacao].maquinas.push(m.nome)
  })

  return Object.entries(grupos)
    .map(([nome, data]) => ({
      nome,
      quantidade: data.quantidade,
      maquinas: data.maquinas,
    }))
    .sort((a, b) => b.quantidade - a.quantidade)
}

export function analisarAcaoResponsavel(machines: Machine[]) {
  const maquinasParadas = machines.filter((m) => m.status === "parada")
  const grupos: Record<string, { quantidade: number; maquinas: string[] }> = {
    Vale: { quantidade: 0, maquinas: [] },
    Atlas: { quantidade: 0, maquinas: [] },
    Outro: { quantidade: 0, maquinas: [] },
  }

  maquinasParadas.forEach((m) => {
    const acao = m.acaoResponsavel || "Outro"
    grupos[acao].quantidade++
    grupos[acao].maquinas.push(m.nome)
  })

  return Object.entries(grupos).map(([nome, data]) => ({
    nome,
    quantidade: data.quantidade,
    maquinas: data.maquinas,
  }))
}

export function analisarPreventivas(machines: Machine[]) {
  const ok = machines.filter((m) => m.statusPreventiva === "OK").length
  const emAtraso = machines.filter((m) => m.statusPreventiva === "Em Atraso").length
  const emPlanejamento = machines.filter((m) => m.statusPreventiva === "Em Planejamento").length
  const foraContrato = machines.filter((m) => !m.temContrato).length

  return {
    ok,
    emAtraso,
    emPlanejamento,
    foraContrato,
    total: machines.length,
  }
}
