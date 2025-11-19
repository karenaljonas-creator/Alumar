import type { Machine, WeeklySnapshot } from "./types"

const weekDates = [
  { date: "2025-06-05", weekId: "2025-W23" },
  { date: "2025-06-12", weekId: "2025-W24" },
  { date: "2025-06-27", weekId: "2025-W26" },
  { date: "2025-08-05", weekId: "2025-W32" },
  { date: "2025-08-11", weekId: "2025-W33" },
  { date: "2025-08-22", weekId: "2025-W34" },
  { date: "2025-09-01", weekId: "2025-W36" },
  { date: "2025-09-08", weekId: "2025-W37" },
  { date: "2025-09-15", weekId: "2025-W38" },
  { date: "2025-09-29", weekId: "2025-W40" },
  { date: "2025-10-06", weekId: "2025-W41" },
  { date: "2025-10-13", weekId: "2025-W42" },
]

const rawData = `SC-2020-02	CAI921341	SIM	Máquina Parada	Máquina Parada	Máquina Parada	Operacional	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	OK
BO-5015SA-02	ITJ2889751	SIM	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Em Atraso
CB-2020-03	BRP075253	SIM	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Em Atraso
CB-5013-03	BRP072166	SIM	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	OK
CB-1024SA-01	BRP071422	SIM	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	OK
CB-5008-02	BRP071324	NÃO	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Fora de Contrato
SC-5008-01	BRP071235	NÃO	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Fora de Contrato
SC-5008-11	BRP081165	NÃO	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Fora de Contrato
SC-5008-12	APF220302	NÃO	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Fora de Contrato
CB-2316SA-08	APFS90967405	NÃO	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Fora de Contrato
CB-2316SA-01	BQD119324	SIM	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Operacional	Operacional	Operacional	Operacional	OK
CB-2316SA-07	APFS90967404	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	OK
CB-2020-26	BQD106934	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Máquina Parada	Máquina Parada	Máquina Parada	OK
SC-2020-02	NSE081488	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
SC-2020-02	NSE081460	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
SC-2020-03	NSE081487	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
SC-2020-03	NSE081500	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
SC-2020-06	NSE081507	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
SC-2020-06	NSE081494	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
CB-2020-04	BRP075254	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
CB-2020-24	BQD107036	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
CB-2020-25	BQD107037	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
CB-2020SA-31	BQD119297	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
FL-5008-14	NSE081505	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
SC-5008-15	NSE081508	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
FL-5008-16	NSE081492	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
FL-5008-17	NSE081506	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
FL-5008-18	NSE081493	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
FL-5008-19	NSE081498	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
FL-5008-20	NSE081485	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
FL-5008-22	NSE081499	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
SC-5008-04	NSE081486	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
SC-5008-04	NSE081501	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
SC-5008-05	NSE081509	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
CB-5013-12	BRP081503	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
CB-5008-11	BRP080378	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
SC-5008-02	ITJ043302	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
SC-5008-13	COMP-SV0079	NÃO	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Fora de Contrato
SC-5008-15	APF220244	NÃO	Operacional	Operacional	Operacional	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Operacional	Operacional	Operacional	Operacional	Operacional	Fora de Contrato
CB-1024SA-02	BRP071423	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
CB-5201SA-01	BQD119293	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
CB-5201SA-02	BQD119294	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Andamento
CB-2104SA-01	BQD119295	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
CB-2104SA-02	BQD119296	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
SC-2104SA-01	ITJ294894	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
SC-2104SA-02	ITJ294895	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
BO-5015SA-01	ITJ289551	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
CB-2316SA-02	BQD119323	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Máquina Parada	Máquina Parada	Máquina Parada	OK
SC-2020-06	CAI921344	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
SC-2020SA-31	ITJ290645	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
SC-2020SA-32	ITJ290647	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Andamento
CB-2020-01	BRP075251	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Andamento
CB-2020-02	BRP075252	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
CB-2020-21	BQD117168	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
CB-2020SA-32	BQD119298	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Andamento
SC-2020-03	CAI921343	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
SC-2020-04	CAI921342	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
SC-2020-05	CAI921345	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
CB-5008-01	BRP071323	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
CB-5008-03	BRP071325	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Andamento
CB-5008-12	BQD109691	SIM	Operacional	Operacional	Operacional	Operacional	Máquina Parada	Máquina Parada	Máquina Parada	Máquina Parada	Operacional	Operacional	Operacional	Operacional	OK
CB-5013-01	BRP071936	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Andamento
SC-5008-05	NSE081495	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Em Atraso
CB-5013-02	BRP071937	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Andamento
CB-5013-04	BRP071935	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
CB-5013-11	BRP081504	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
CB-5013-13	BRP081505	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
CB-2316SA-03	BQD119325	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
CB-2316SA-04	S90967401	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
CB-2316SA-05	S90967402	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
CB-2316SA-06	S90967403	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
CB-2316SA-09	S90967406	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
SC-2316SA-01	ITJ290643	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
SC-2316SA-02	ITJ290644	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
CB-6044SA-01	BQR131279	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
CP-1023SA-01	BQR131278	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	OK
Reservatório SLB3	APF243204	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Em Atraso
CB-1023SA-02	BRP071425	SIM	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Operacional	Andamento`

function getTipoFromTag(tag: string): string {
  if (tag.startsWith("SC-") || tag.includes("Secador")) return "Secador"
  if (tag.startsWith("CB-") || tag.includes("Compressor")) return "Compressor"
  if (tag.startsWith("BO-") || tag.includes("Soprador")) return "Soprador"
  if (tag.includes("FL-") || tag.includes("Filtro")) return "Filtro"
  if (tag.includes("CP-")) return "Compressor"
  if (tag.includes("Reservatório")) return "Reservatório"
  return "Compressor"
}

function getLocalizacaoFromTag(tag: string): string {
  if (tag.includes("2020")) return "Filtragem"
  if (tag.includes("5008") || tag.includes("5013")) return "Flotação"
  if (tag.includes("2316")) return "Flotação SL III"
  if (tag.includes("2104") || tag.includes("5015")) return "Britagem"
  if (tag.includes("5201")) return "Água recuperada"
  if (tag.includes("1024") || tag.includes("1023")) return "Mina de Salobo - Posto Pesado"
  if (tag.includes("6044")) return "Mina de Salobo - Manutenção de Pneus"
  if (tag.includes("Reservatório")) return "Reservatório SLB3"
  return "Filtragem"
}

export function generateHistoricalSnapshots(): WeeklySnapshot[] {
  const lines = rawData.trim().split("\n")
  const snapshots: WeeklySnapshot[] = []

  weekDates.forEach((week, weekIndex) => {
    const machines: Machine[] = []

    lines.forEach((line, machineIndex) => {
      const parts = line.split("\t")
      const tag = parts[0].trim()
      const numeroSerie = parts[1].trim()
      const contrato = parts[2].trim() === "SIM"
      const statusIndex = 3 + weekIndex
      const status = parts[statusIndex]?.trim() || "Operacional"
      const manutencaoPreventiva = parts[15]?.trim() || "OK"

      machines.push({
        id: `${machineIndex + 1}`,
        nome: tag,
        tipo: getTipoFromTag(tag),
        modelo: "",
        numeroSerie,
        localizacao: getLocalizacaoFromTag(tag),
        data: week.date,
        status: status === "Operacional" ? "operacional" : "parada",
        motivoParada: status === "Máquina Parada" ? "Máquina parada" : "",
        descricaoDetalhada: "",
        acaoResponsavel: "Outro",
        dataParada: undefined,
        statusPreventiva: manutencaoPreventiva as any,
        dataPreventiva: undefined,
        manutencaoPreventiva,
        temContrato: contrato,
        responsavel: "",
        tempoParada: 0,
      })
    })

    const operational = machines.filter((m) => m.status === "operacional").length
    const stopped = machines.filter((m) => m.status === "parada").length
    const availability = (operational / machines.length) * 100

    snapshots.push({
      id: `snapshot-${week.weekId}`,
      weekId: week.weekId,
      date: week.date,
      machines,
      totalMachines: machines.length,
      operational,
      stopped,
      maintenance: 0,
      availability: Math.round(availability * 10) / 10,
    })
  })

  return snapshots
}

export function loadHistoricalData() {
  const snapshots = generateHistoricalSnapshots()

  snapshots.forEach((snapshot) => {
    localStorage.setItem(`weekly-snapshot-${snapshot.weekId}`, JSON.stringify(snapshot))
  })

  console.log(`[v0] Carregados ${snapshots.length} snapshots semanais históricos`)
  return snapshots
}
