// Script para importar dados da semana 42 (13/10/2025)
// Este script processa os dados da planilha e cria o snapshot histórico

const rawData = `LOCALIZAÇÃO	TAG	Número de Série	Tipo	Contrato	data	Status	Manutenções Preventivas	Data de Parada	Ordem de Serviço	Ação	Observações 
Flotação SL III	CB-2316SA-07	APFS90967404	Compressor	SIM	13/out	Operacional	OK		408830933		
Filtragem	CB-2020-26	BQD106934	Compressor	SIM	13/out	Operacional	OK			ATLAS	Resfriador coletado pela Vale
Filtragem	CB-2020-04	BRP075254	Compressor	SIM	13/out	Operacional	OK			ATLAS	Aditivo recente
Filtragem	CB-2020-24	BQD107036	Compressor	SIM	13/out	Operacional	OK				
Filtragem	CB-2020-25	BQD107037	Compressor	SIM	13/out	Operacional	OK			ATLAS	Programação para execução - Material entregue
Filtragem	CB-2020SA-31	BQD119297	Compressor	SIM	13/out	Operacional	OK			ATLAS	Aguardando envio dos filtros corretos
Flotação	CB-5013-12	BRP081503	Compressor	SIM	13/out	Operacional	OK				
Flotação	CB-5008-11	BRP080378	Compressor	SIM	13/out	Operacional	OK				
Filtragem	CB-2020-03	BRP075253	Compressor	SIM	13/out	Máquina Parada	Em Atraso	25/03/2025	406824977	VALE	Motor enviado para revisão no fornecedor Kaíros
Flotação	CB-5013-03	BRP072166	Compressor	SIM	13/out	Máquina Parada	OK	04/02/2025	408250175	VALE	Aguardando envio das peças conclusão de montagem, aguardando aditivo para envio das peças
Mina de Salobo - Posto Pesado 	CB-1024SA-01	BRP071422	Compressor	SIM	13/out	Máquina Parada	OK	01/11/2024	407889184	VALE	Atividade sendo realizada pelo time da Britagem, acompanhada pelo Fernando Teixeira. (Vale)
Flotação	CB-5008-02	BRP071324	Compressor	NÃO	13/out	Máquina Parada	Fora de Contrato	11/07/2024	407441119	VALE	Aguardando aditivo para envio de peças
Mina de Salobo - Posto Pesado 	CB-1024SA-02	BRP071423	Compressor	SIM	13/out	Operacional	OK			VALE	Aguardando disponibilidade de parada; equipamento apresentando ruído
Agua recuperada	CB-5201SA-01	BQD119293	Compressor	SIM	13/out	Operacional	OK				
Agua recuperada	CB-5201SA-02	BQD119294	Compressor	SIM	13/out	Operacional	Andamento				
Britagem	CB-2104SA-01	BQD119295	Compressor	SIM	13/out	Operacional	OK				
Britagem	CB-2104SA-02	BQD119296	Compressor	SIM	13/out	Operacional	OK				
Flotação SL III	CB-2316SA-02	BQD119323	Compressor	SIM	13/out	Operacional	OK				
Filtragem	CB-2020-01	BRP075251	Compressor	SIM	13/out	Operacional	Andamento				
Filtragem	CB-2020-02	BRP075252	Compressor	SIM	13/out	Operacional	OK				
Filtragem	CB-2020-21	BQD117168	Compressor	SIM	13/out	Operacional	OK		408916066	ATLAS	Envio do motor do ventilador previsto para 15/09
Filtragem	CB-2020SA-32	BQD119298	Compressor	SIM	13/out	Operacional	Andamento				
Flotação	CB-5008-01	BRP071323	Compressor	SIM	13/out	Operacional	OK				
Flotação	CB-5008-03	BRP071325	Compressor	SIM	13/out	Operacional	Andamento				
Flotação	CB-5008-12	BQD109691	Compressor	SIM	13/out	Operacional	OK	08/08/2025		VALE	Motor principal com problema no rolamento dianteiro. Será tratado pelo fornecedor Cairos
Flotação	CB-5013-01	BRP071936	Compressor	SIM	13/out	Operacional	Andamento			VALE	Problema na subestação (aguardando elétrica)
Flotação SL III	CB-2316SA-08	APFS90967405	Compressor	NÃO	13/out	Máquina Parada	Fora de Contrato	21/10/2024	407874341	VALE	Em processo de campras pelo time da elétrica, sendo acompanhado pelo Luiz Almeida
Flotação	CB-5013-02	BRP071937	Compressor	SIM	13/out	Operacional	Andamento				
Flotação	CB-5013-04	BRP071935	Compressor	SIM	13/out	Operacional	OK				
Flotação	CB-5013-11	BRP081504	Compressor	SIM	13/out	Operacional	OK				
Flotação	CB-5013-13	BRP081505	Compressor	SIM	13/out	Operacional	OK				
Flotação SL III	CB-2316SA-01	BQD119324	Compressor	SIM	13/out	Máquina Parada	OK	20/08/2025		VALE	Elemento compressor travado, orçamento enviado ao Anderson Machado em 20/08
Flotação SL III	CB-2316SA-03	BQD119325	Compressor	SIM	13/out	Operacional	OK				
Flotação SL III	CB-2316SA-04	S90967401	Compressor	SIM	13/out	Operacional	OK				
Flotação SL III	CB-2316SA-05	S90967402	Compressor	SIM	13/out	Operacional	OK			VALE	Pendente elétrica rearmar subestação 
Flotação SL III	CB-2316SA-06	S90967403	Compressor	SIM	13/out	Operacional	OK				
Flotação SL III	CB-2316SA-09	S90967406	Compressor	SIM	13/out	Operacional	OK				
Mina de Salobo - Manutenção de Pneus	CB-6044SA-01	BQR131279	Compressor	SIM	13/out	Operacional	OK				
Mina de Salobo - Oficina Central	 CP-1023SA-01	BQR131278	Compressor	SIM	13/out	Operacional	OK				
Mina de Salobo - Oficina Central	CB-1023SA-02	BRP071425	Compressor	SIM	13/out	Operacional	Andamento				Aguardando elemento compressor Vale
Filtragem	SC-2020-02	NSE081488	Filtro - PD525 	SIM	13/out	Operacional	OK			ATLAS	
Filtragem	SC-2020-03	NSE081487	Filtro - PD525 	SIM	13/out	Operacional	OK				
Filtragem	SC-2020-06	NSE081507	Filtro - PD525 	SIM	13/out	Operacional	OK			ATLAS	
Flotação	FL-5008-14	NSE081505	Filtro - PD525 	SIM	13/out	Operacional	OK			ATLAS	
Flotação	SC-5008-15	NSE081508	Filtro - PD525 	SIM	13/out	Operacional	OK				
Flotação	FL-5008-17	NSE081506 (5008-02)	Filtro - PD525 	SIM	13/out	Operacional	OK				
Flotação	FL-5008-20	NSE081485	Filtro - PD525 	SIM	13/out	Operacional	OK				
Flotação	SC-5008-04	NSE081486	Filtro - PD525 	SIM	13/out	Operacional	OK				
Flotação	SC-5008-05	NSE081509	Filtro - PD525 	SIM	13/out	Operacional	OK				
Reservatório SLB3	Reservatório SLB3	APF243204	Filtro DD	SIM	13/out	Operacional	Em Atraso				
Filtragem	SC-2020-02	NSE081460	Filtro -DD525 	SIM	13/out	Operacional	OK			ATLAS	
Filtragem	SC-2020-03	NSE081500	Filtro -DD525 	SIM	13/out	Operacional	OK				
Filtragem	SC-2020-06	NSE081494	Filtro -DD525 	SIM	13/out	Operacional	OK			ATLAS	
Flotação	FL-5008-16	NSE081492 (5008-03)	Filtro -DD525 	SIM	13/out	Operacional	OK			ATLAS	
Flotação	FL-5008-18	NSE081493 (5008-01)	Filtro -DD525 	SIM	13/out	Operacional	OK				
Flotação	FL-5008-19	NSE081498	Filtro -DD525 	SIM	13/out	Operacional	OK				
Flotação	FL-5008-22	NSE081499	Filtro -DD525 	SIM	13/out	Operacional	OK				
Flotação	SC-5008-04	NSE081501	Filtro -DD525 	SIM	13/out	Operacional	OK				
Flotação	SC-5008-05	NSE081495	Filtro -DD525 	SIM	13/out	Operacional	Em Atraso				Art aprovada, em agendamento
Filtragem	SC-2020-02	CAI921341	Secador	SIM	13/out	Máquina Parada	OK	26/09/2025	408019065	ATLAS	Equipamento com vazamento de gás 
Flotação	SC-5008-02	ITJ043302	Secador	SIM	13/out	Operacional	OK			ATLAS	Programação para execução
Flotação	SC-5008-01	BRP071235	Secador	NÃO	13/out	Máquina Parada	Fora de Contrato	01/06/2015	407889240	VALE	Aguardando aditivo para envio de peças
Flotação	SC-5008-11	BRP081165	Secador	NÃO	13/out	Máquina Parada	Fora de Contrato	04/07/2016	164613	VALE	Aguardando aditivo para envio de peças
Flotação	SC-5008-12	APF220302	Secador	NÃO	13/out	Máquina Parada	Fora de Contrato	06/11/2024	407889114	VALE	Aguardando aditivo para envio de peças
Flotação	SC-5008-13	COMP-SV0079	Secador	NÃO	13/out	Operacional	Fora de Contrato				
Flotação	SC-5008-15	APF220244	Secador	NÃO	13/out	Operacional	Fora de Contrato			VALE	Equipamento com sobrecarga no ventilador
Britagem	SC-2104SA-01	ITJ294894	Secador	SIM	13/out	Operacional	OK				
Britagem	SC-2104SA-02	ITJ294895	Secador	SIM	13/out	Operacional	OK				
Filtragem	SC-2020-06	CAI921344	Secador	SIM	13/out	Operacional	OK				
Filtragem	SC-2020SA-31	ITJ290645	Secador	SIM	13/out	Operacional	OK				
Filtragem	SC-2020SA-32	ITJ290647	Secador	SIM	13/out	Operacional	Andamento				
Filtragem	SC-2020-03	CAI921343	Secador	SIM	13/out	Operacional	OK				
Filtragem	SC-2020-04	CAI921342	Secador	SIM	13/out	Operacional	OK				
Filtragem	SC-2020-05	CAI921345	Secador	SIM	13/out	Operacional	OK				
Flotação SL III	SC-2316SA-01	ITJ290643	Secador	SIM	13/out	Operacional	OK				
Flotação SL III	SC-2316SA-02	ITJ290644	Secador	SIM	13/out	Operacional	OK				
Britagem	BO-5015SA-02	ITJ2889751	Soprador	SIM	13/out	Máquina Parada	Em Atraso	04/11/2024		VALE	Solicitado o envio do inversor para nossa oficina em 14/04, logistica da Vale está dando andamento no processo.Preventiva será feita no retorno do inversor
Britagem	BO-5015SA-01	ITJ289551	Soprador	SIM	13/out	Operacional	OK				
`

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function processData() {
  console.log("[v0] Iniciando processamento dos dados da semana 42...")

  const lines = rawData.trim().split("\n")
  const headers = lines[0].split("\t")

  console.log("[v0] Cabeçalhos encontrados:", headers)
  console.log("[v0] Total de linhas (incluindo cabeçalho):", lines.length)

  const machines = []

  // Processar cada linha (pular cabeçalho)
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split("\t")

    if (values.length < 6) continue // Pular linhas vazias

    const localizacao = values[0]?.trim() || ""
    const tag = values[1]?.trim() || ""
    const numeroSerie = values[2]?.trim() || ""
    const tipoRaw = values[3]?.trim() || ""
    const contrato = values[4]?.trim() || ""
    const status = values[6]?.trim() || ""
    const preventivaRaw = values[7]?.trim() || ""
    const acao = values[10]?.trim() || ""
    const observacoes = values[11]?.trim() || ""

    // Normalizar tipo
    let tipo = "Outro"
    if (tipoRaw.includes("Compressor")) tipo = "Compressor"
    else if (tipoRaw.includes("Filtro")) tipo = "Filtro"
    else if (tipoRaw.includes("Secador")) tipo = "Secador"
    else if (tipoRaw.includes("Soprador")) tipo = "Soprador"

    // Normalizar status
    let statusNormalizado = "operacional"
    if (status.includes("Parada")) statusNormalizado = "parada"
    else if (status.includes("Manutenção")) statusNormalizado = "manutencao"

    // Normalizar preventiva
    let preventiva = "ok"
    if (preventivaRaw.includes("Atraso")) preventiva = "atrasada"
    else if (preventivaRaw.includes("Andamento")) preventiva = "em-andamento"
    else if (preventivaRaw.includes("Fora")) preventiva = "fora-contrato"

    const machine = {
      id: `${tag}-${numeroSerie}`.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      tag,
      modelo: numeroSerie,
      localizacao,
      tipo,
      status: statusNormalizado,
      preventiva,
      temContrato: contrato === "SIM",
      acao: acao || undefined,
      observacoes: observacoes || undefined,
    }

    machines.push(machine)
  }

  console.log("[v0] Total de máquinas processadas:", machines.length)
  console.log("[v0] Tipos de máquinas:", {
    Compressor: machines.filter((m) => m.tipo === "Compressor").length,
    Filtro: machines.filter((m) => m.tipo === "Filtro").length,
    Secador: machines.filter((m) => m.tipo === "Secador").length,
    Soprador: machines.filter((m) => m.tipo === "Soprador").length,
    Outro: machines.filter((m) => m.tipo === "Outro").length,
  })

  return machines
}

function calculateStats(allMachines) {
  const tiposPrincipais = ["Compressor", "Secador", "Soprador"]
  const maquinasPrincipais = allMachines.filter((m) => tiposPrincipais.includes(m.tipo))

  const operacionais = maquinasPrincipais.filter((m) => m.status === "operacional").length
  const paradas = maquinasPrincipais.filter((m) => m.status === "parada").length
  const manutencao = maquinasPrincipais.filter((m) => m.status === "manutencao").length
  const total = maquinasPrincipais.length
  const disponibilidade = total > 0 ? (operacionais / total) * 100 : 0

  console.log("[v0] Estatísticas calculadas (apenas tipos principais):", {
    total,
    operacionais,
    paradas,
    manutencao,
    disponibilidade: disponibilidade.toFixed(1) + "%",
  })

  return {
    total,
    operacionais,
    paradas,
    manutencao,
    disponibilidade,
    comContrato: allMachines.filter((m) => m.temContrato === true).length,
    semContrato: allMachines.filter((m) => m.temContrato === false).length,
  }
}

function getMaquinasParadas(machines) {
  return machines
    .filter((m) => m.status === "parada")
    .map((m) => ({
      tag: m.tag,
      modelo: m.modelo,
      localizacao: m.localizacao,
      tipo: m.tipo,
      acao: m.acao,
      observacoes: m.observacoes,
    }))
}

function createWeek42Snapshot() {
  const machines = processData()

  // Data: 13/10/2025
  const date = new Date(2025, 9, 13) // Mês 9 = outubro (0-indexed)
  const weekNumber = getWeekNumber(date)
  const year = date.getFullYear()
  const semana = `${year}-W${weekNumber.toString().padStart(2, "0")}`

  console.log("[v0] Data:", date.toLocaleDateString("pt-BR"))
  console.log("[v0] Semana ISO 8601:", semana)

  const stats = calculateStats(machines)
  const maquinasParadas = getMaquinasParadas(machines)

  const snapshot = {
    id: `snapshot-${Date.now()}`,
    semana,
    dataRegistro: date.toISOString(),
    stats,
    machines, // TODAS as 78 máquinas
    maquinasParadas,
  }

  console.log("[v0] Snapshot criado:", {
    semana: snapshot.semana,
    data: new Date(snapshot.dataRegistro).toLocaleDateString("pt-BR"),
    totalMaquinas: snapshot.machines.length,
    totalStats: snapshot.stats.total,
    maquinasParadas: snapshot.maquinasParadas.length,
  })

  return snapshot
}

function saveSnapshot() {
  const HISTORY_STORAGE_KEY = "gestao-maquinas-historico"

  // Criar novo snapshot
  const newSnapshot = createWeek42Snapshot()

  // Carregar snapshots existentes
  let history = { snapshots: [] }
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY)
    if (stored) {
      history = JSON.parse(stored)
    }
  } catch (error) {
    console.error("[v0] Erro ao carregar histórico existente:", error)
  }

  // Remover snapshot existente da semana 42 (se houver)
  history.snapshots = history.snapshots.filter((s) => s.semana !== newSnapshot.semana)

  // Adicionar novo snapshot
  history.snapshots.push(newSnapshot)

  // Ordenar por data (mais recente primeiro)
  history.snapshots.sort((a, b) => new Date(b.dataRegistro).getTime() - new Date(a.dataRegistro).getTime())

  // Salvar no localStorage
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history))

  console.log("[v0] ✅ Snapshot salvo com sucesso!")
  console.log("[v0] Total de snapshots no histórico:", history.snapshots.length)
  console.log("[v0] Semanas disponíveis:", history.snapshots.map((s) => s.semana).join(", "))
  console.log("[v0] 🔄 Recarregue a página para ver os dados importados!")

  return newSnapshot
}

console.log("[v0] ========================================")
console.log("[v0] Importação de Dados - Semana 42")
console.log("[v0] ========================================")
saveSnapshot()
