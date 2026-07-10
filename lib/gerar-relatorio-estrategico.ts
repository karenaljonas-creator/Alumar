import { ATLAS_COPCO_LOGO_DATA_URI } from "@/lib/atlas-copco-logo"
import { ROBOTO_400, ROBOTO_500, ROBOTO_700, ROBOTO_900 } from "@/lib/roboto-font"
import { createClient } from "@/lib/supabase/client"
import { loadContrato } from "@/lib/contrato-storage"

/* ================================================================== */
/* Relatório Gerencial de Estoque Estratégico (A4 Landscape)          */
/* Página 1 - Resumo Executivo                                        */
/* Dados cruzados de: Entrada + Saída + Estoque Estratégico           */
/* ================================================================== */

/* ---- Paleta (identidade Atlas Copco do app) ---- */
const AZUL = "#0092bc" // Atlas Copco Blue OFICIAL (--primary)
const AZUL_ESCURO = "#0c2c44" // usado como fundo escuro (igual ao relatório de paradas)
const AZUL_MEDIO = "#15607a"
const AZUL_CLARO_BG = "#e6f4f9"
const TEXTO = "#1f2d3a"
const TEXTO_SUAVE = "#5b7083"
const BORDA = "#e2e8f0"
const TRILHA = "#eef2f6"

/* ---- Item recebido do componente (Estoque Estratégico) ---- */
export interface ItemEstrategicoRelatorio {
  codigo: string
  descricao: string
  saldo: number
  quantidade_minima: number | null
  diferenca: number | null
  status: "OK" | "Repor" | "Analisar"
}

interface DadosPagina1 {
  cliente: string
  contrato: string
  planta: string
  periodoInicio: string
  periodoFim: string
  dataEmissao: string
  aderenciaPct: number
  totalOk: number
  totalAvaliaveis: number
  deficitTotal: number
  taxaUtilizacao: number
  itensSemUso: number
  pecasConsumidas: number
  equipamentosAtendidos: number
  abaixoMinimoPct: number
  topSemUso: { descricao: string; dias: number }[]
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function fmtData(dateStr?: string | null): string {
  if (!dateStr) return "-"
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return "-"
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function calcularDias(data: string | null): number {
  if (!data) return 0
  const d = new Date(data)
  if (Number.isNaN(d.getTime())) return 0
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)))
}

const PREFIXO_ORIGEM_ESTRATEGICA = "estoque estratégico"

/* ------------------------------------------------------------------ */
/* Ícones (SVG inline, stroke currentColor)                            */
/* ------------------------------------------------------------------ */

function icone(nome: string, size = 18): string {
  const base = `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`
  const paths: Record<string, string> = {
    target: `<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>`,
    arrowDown: `<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>`,
    pie: `<path d="M12 3a9 9 0 1 0 9 9h-9Z"/><path d="M12 3v9h9a9 9 0 0 0-9-9Z"/>`,
    box: `<path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>`,
    stack: `<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>`,
    equip: `<rect x="4" y="4" width="7" height="16" rx="1"/><rect x="14" y="4" width="6" height="16" rx="1"/><path d="M7 8h.01M7 12h.01M17 8h.01M17 12h.01"/>`,
    alert: `<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>`,
    trend: `<path d="M3 17l6-6 4 4 7-7"/><path d="M14 8h7v7"/>`,
    user: `<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>`,
    doc: `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/>`,
    pin: `<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>`,
    cal: `<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/>`,
  }
  return `<svg ${base}>${paths[nome] || ""}</svg>`
}

/* ------------------------------------------------------------------ */
/* Componentes visuais                                                 */
/* ------------------------------------------------------------------ */

function kpiCard(ico: string, titulo: string, valor: string, legenda: string): string {
  return `
  <div style="background:#fff;border:1px solid ${BORDA};border-radius:12px;padding:14px 16px;box-shadow:0 1px 3px rgba(15,45,68,.06);display:flex;flex-direction:column;gap:6px;">
    <div style="display:flex;align-items:center;gap:9px;">
      <span style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9px;background:${AZUL_CLARO_BG};color:${AZUL};flex:none;">${ico}</span>
      <span style="font-size:12.5px;font-weight:700;color:#26333f;line-height:1.2;">${escapeHtml(titulo)}</span>
    </div>
    <div style="font-size:34px;font-weight:900;color:${AZUL};line-height:1;">${escapeHtml(valor)}</div>
    <div style="font-size:10.5px;color:${TEXTO_SUAVE};line-height:1.3;">${escapeHtml(legenda)}</div>
  </div>`
}

function barraSemUso(item: { descricao: string; dias: number }, maxDias: number): string {
  const pct = maxDias > 0 ? Math.max(4, Math.round((item.dias / maxDias) * 100)) : 0
  return `
  <div style="display:flex;align-items:center;gap:10px;">
    <div style="width:150px;font-size:10.5px;color:#33475b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(item.descricao || "-")}</div>
    <div style="flex:1;height:13px;background:${TRILHA};border-radius:7px;overflow:hidden;">
      <div style="height:100%;width:${pct}%;background:${AZUL};border-radius:7px;"></div>
    </div>
    <div style="width:46px;text-align:right;font-size:10.5px;font-weight:700;color:${TEXTO};">${item.dias}</div>
  </div>`
}

function pontoAtencao(ico: string, titulo: string, sub: string): string {
  return `
  <div style="display:flex;align-items:flex-start;gap:10px;">
    <span style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:8px;background:${AZUL_CLARO_BG};color:${AZUL};flex:none;">${ico}</span>
    <div style="display:flex;flex-direction:column;gap:1px;">
      <span style="font-size:11.5px;font-weight:800;color:#26333f;line-height:1.25;">${escapeHtml(titulo)}</span>
      <span style="font-size:10.5px;color:${TEXTO_SUAVE};line-height:1.3;">${escapeHtml(sub)}</span>
    </div>
  </div>`
}

function itemSidebar(ico: string, rotulo: string, valor: string): string {
  return `
  <div style="display:flex;align-items:flex-start;gap:9px;">
    <span style="color:#7fd0e8;margin-top:1px;flex:none;">${ico}</span>
    <div style="display:flex;flex-direction:column;gap:1px;">
      <span style="font-size:9.5px;text-transform:uppercase;letter-spacing:.5px;color:#8bb4cc;">${escapeHtml(rotulo)}</span>
      <span style="font-size:12px;font-weight:600;color:#eef6fb;line-height:1.3;">${escapeHtml(valor)}</span>
    </div>
  </div>`
}

/* ------------------------------------------------------------------ */
/* Página 1 - Resumo Executivo                                         */
/* ------------------------------------------------------------------ */

function paginaResumoExecutivo(d: DadosPagina1): string {
  const maxDias = Math.max(1, ...d.topSemUso.map((i) => i.dias))
  const barras = d.topSemUso.length
    ? d.topSemUso.map((i) => barraSemUso(i, maxDias)).join("")
    : `<div style="font-size:11px;color:${TEXTO_SUAVE};padding:8px 0;">Nenhum item sem utilização no período.</div>`

  return `
  <div class="page">
    <div class="page-inner">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div style="background:#fff;border-radius:8px;padding:9px 12px;display:inline-flex;align-self:flex-start;">
          <img src="${ATLAS_COPCO_LOGO_DATA_URI}" alt="Atlas Copco" style="height:26px;display:block;" />
        </div>

        <div style="margin-top:6px;">
          <div style="font-size:12px;font-weight:600;color:#9dc4da;letter-spacing:.3px;">Relatório Gerencial de</div>
          <div style="font-size:30px;font-weight:900;color:#fff;line-height:1.05;margin-top:4px;">Estoque<br/>Estratégico</div>
          <div style="font-size:11px;color:#a9c8db;line-height:1.4;margin-top:10px;">Monitoramento, utilização e rastreabilidade dos itens estratégicos</div>
        </div>

        <div style="height:1px;background:rgba(255,255,255,.15);margin:4px 0;"></div>

        <div style="display:flex;flex-direction:column;gap:13px;">
          ${itemSidebar(icone("user", 15), "Cliente", d.cliente)}
          ${itemSidebar(icone("doc", 15), "Contrato", d.contrato)}
          ${itemSidebar(icone("pin", 15), "Planta", d.planta)}
          ${itemSidebar(icone("cal", 15), "Período analisado", `${d.periodoInicio} a ${d.periodoFim}`)}
          ${itemSidebar(icone("cal", 15), "Data de emissão", d.dataEmissao)}
        </div>
      </aside>

      <!-- Conteúdo -->
      <main class="conteudo">
        <div>
          <div style="font-size:26px;font-weight:900;color:${AZUL_MEDIO};letter-spacing:.3px;">RESUMO EXECUTIVO</div>
          <div style="font-size:13px;color:${TEXTO_SUAVE};margin-top:2px;">Visão geral do estoque estratégico</div>
        </div>

        <!-- KPIs -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
          ${kpiCard(icone("target"), "Aderência ao Estoque", `${d.aderenciaPct}%`, `${d.totalOk} de ${d.totalAvaliaveis} itens`)}
          ${kpiCard(icone("arrowDown"), "Déficit total", d.deficitTotal > 0 ? `-${d.deficitTotal}` : "0", "Unidades necessárias para reposição")}
          ${kpiCard(icone("pie"), "Taxa de utilização", `${d.taxaUtilizacao}%`, "do estoque estratégico")}
          ${kpiCard(icone("box"), "Itens sem utilização", String(d.itensSemUso), "desde a entrada")}
          ${kpiCard(icone("stack"), "Peças consumidas", String(d.pecasConsumidas), "no período")}
          ${kpiCard(icone("equip"), "Equipamentos atendidos", String(d.equipamentosAtendidos), "no período")}
        </div>

        <!-- Gráfico + Pontos de atenção -->
        <div style="display:grid;grid-template-columns:1.55fr 1fr;gap:12px;flex:1;min-height:0;">
          <div style="background:#fff;border:1px solid ${BORDA};border-radius:12px;padding:14px 16px;box-shadow:0 1px 3px rgba(15,45,68,.06);display:flex;flex-direction:column;">
            <div style="font-size:12px;font-weight:800;color:${AZUL_MEDIO};letter-spacing:.5px;text-transform:uppercase;margin-bottom:12px;">Top 10 itens mais antigos sem utilização (dias)</div>
            <div style="display:flex;flex-direction:column;gap:8px;justify-content:space-between;flex:1;">
              ${barras}
            </div>
          </div>

          <div style="background:#fff;border:1px solid ${BORDA};border-radius:12px;padding:14px 16px;box-shadow:0 1px 3px rgba(15,45,68,.06);display:flex;flex-direction:column;">
            <div style="font-size:12px;font-weight:800;color:${AZUL_MEDIO};letter-spacing:.5px;text-transform:uppercase;margin-bottom:14px;">Pontos de Atenção</div>
            <div style="display:flex;flex-direction:column;gap:16px;justify-content:space-between;flex:1;">
              ${pontoAtencao(icone("alert"), "Maior período sem utilização", `${maxDias} dias`)}
              ${pontoAtencao(icone("trend"), "Abaixo do mínimo", `${d.abaixoMinimoPct}% dos itens estão abaixo do mínimo`)}
              ${pontoAtencao(icone("box"), "Itens sem movimentação desde a entrada", `${d.itensSemUso} itens`)}
              ${pontoAtencao(icone("equip"), "Equipamentos atendidos no período", `${d.equipamentosAtendidos} equipamentos`)}
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- Rodapé -->
    <div class="rodape">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:6px;background:${AZUL};color:#fff;">${icone("trend", 13)}</span>
        <span style="font-size:10.5px;font-weight:700;color:#26333f;">Relatório Gerencial de Estoque Estratégico</span>
      </div>
      <div style="display:flex;align-items:center;gap:18px;font-size:10px;color:${TEXTO_SUAVE};">
        <span>Cliente: <strong style="color:#26333f;">${escapeHtml(d.cliente)}</strong></span>
        <span>Contrato: <strong style="color:#26333f;">${escapeHtml(d.contrato)}</strong></span>
        <span>Planta: <strong style="color:#26333f;">${escapeHtml(d.planta)}</strong></span>
      </div>
      <div style="display:flex;align-items:center;">
        <img src="${ATLAS_COPCO_LOGO_DATA_URI}" alt="Atlas Copco" style="height:18px;display:block;" />
      </div>
    </div>
  </div>`
}

/* ------------------------------------------------------------------ */
/* Shell HTML + impressão                                              */
/* ------------------------------------------------------------------ */

function montarDocumento(titulo: string, paginas: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(titulo)}</title>
<style>
  @font-face { font-family:"ReportRoboto"; font-style:normal; font-weight:400; font-display:block; src:url(${ROBOTO_400}) format("woff2"); }
  @font-face { font-family:"ReportRoboto"; font-style:normal; font-weight:500; font-display:block; src:url(${ROBOTO_500}) format("woff2"); }
  @font-face { font-family:"ReportRoboto"; font-style:normal; font-weight:700; font-display:block; src:url(${ROBOTO_700}) format("woff2"); }
  @font-face { font-family:"ReportRoboto"; font-style:normal; font-weight:900; font-display:block; src:url(${ROBOTO_900}) format("woff2"); }
  @page { size: A4 landscape; margin: 0; }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  html, body {
    font-family:"ReportRoboto", Arial, Helvetica, sans-serif;
    font-synthesis:none;
    text-rendering:geometricPrecision;
    -webkit-font-smoothing:antialiased;
    color:${TEXTO};
    margin:0; padding:0;
    background:#e9edf1;
  }
  body * { font-family:inherit; }
  .page {
    width:297mm; height:210mm;
    background:#f4f7f9;
    position:relative;
    margin:0 auto 8mm;
    page-break-after:always; break-after:page;
    box-shadow:0 2px 12px rgba(0,0,0,.15);
    overflow:hidden;
    display:flex; flex-direction:column;
  }
  .page:last-child { page-break-after:auto; margin-bottom:0; }
  .page-inner { flex:1; display:flex; min-height:0; }
  .sidebar {
    width:82mm; flex:none;
    background:linear-gradient(180deg, ${AZUL_ESCURO} 0%, #0f3f5f 100%);
    color:#fff; padding:14mm 11mm;
    display:flex; flex-direction:column; gap:16px;
  }
  .conteudo {
    flex:1; min-width:0;
    padding:11mm 12mm 8mm;
    display:flex; flex-direction:column; gap:13px;
  }
  .rodape {
    flex:none; height:13mm;
    background:#fff; border-top:1px solid ${BORDA};
    display:flex; align-items:center; justify-content:space-between;
    padding:0 12mm;
  }
  @media print {
    body { background:#fff; }
    .page { margin:0; box-shadow:none; }
  }
</style>
</head>
<body>
  ${paginas}
  <script>
    var jaImprimiu = false;
    function dispararImpressao() {
      if (jaImprimiu) return;
      jaImprimiu = true;
      setTimeout(function () { window.print(); }, 200);
    }
    function carregarFontesEImprimir() {
      if (!document.fonts || !document.fonts.load) { setTimeout(dispararImpressao, 800); return; }
      var pesos = ["400","500","700","900"];
      var amostra = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789áéíóúâêôãõçÁÉÍÓÚÂÊÔÃÕÇ|";
      var promessas = pesos.map(function (p) { return document.fonts.load(p + ' 16px "ReportRoboto"', amostra).catch(function(){}); });
      Promise.all(promessas).then(function(){ return document.fonts.ready; }).then(dispararImpressao).catch(dispararImpressao);
      setTimeout(dispararImpressao, 3000);
    }
    if (document.readyState === "complete") carregarFontesEImprimir();
    else window.addEventListener("load", carregarFontesEImprimir);
  </script>
</body>
</html>`
}

function abrirDocumento(html: string): boolean {
  const printWindow = window.open("", "_blank", "width=1100,height=800")
  if (!printWindow) return false
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  return true
}

/* ------------------------------------------------------------------ */
/* Carregamento e cruzamento dos dados                                 */
/* ------------------------------------------------------------------ */

async function carregarDadosPagina1(itens: ItemEstrategicoRelatorio[]): Promise<DadosPagina1> {
  const supabase = createClient()

  // KPIs derivados do Estoque Estratégico (mesmas fórmulas da tela)
  const totalRepor = itens.filter((i) => i.status === "Repor").length
  const totalOk = itens.filter((i) => i.status === "OK").length
  const totalMonitorados = itens.length
  const totalAvaliaveis = totalOk + totalRepor
  const aderenciaPct = totalAvaliaveis ? Math.round((totalOk / totalAvaliaveis) * 100) : 0
  const deficitTotal = itens.reduce(
    (acc, i) => acc + ((i.diferenca ?? 0) < 0 ? Math.abs(i.diferenca as number) : 0),
    0,
  )
  const abaixoMinimoPct = totalMonitorados ? Math.round((totalRepor / totalMonitorados) * 100) : 0

  // Cruzamento Entrada + Saída (mesma lógica do painel de análise)
  const { data: entradas } = await supabase
    .from("estoque_pecas")
    .select("codigo, descricao, origem, data_emissao, nota_fiscal")
  const { data: saidas } = await supabase
    .from("saida_pecas")
    .select("codigo, descricao, quantidade, compressor, ordem_servico, nota_fiscal")

  const ehEstrategica = (origem?: string | null) =>
    (origem || "").toLowerCase().startsWith(PREFIXO_ORIGEM_ESTRATEGICA)

  // NF -> origem
  const mapaOrigem = new Map<string, string>()
  for (const e of entradas || []) {
    if (e.nota_fiscal && e.origem && !mapaOrigem.has(e.nota_fiscal)) {
      mapaOrigem.set(e.nota_fiscal, e.origem)
    }
  }

  // Entradas estratégicas por código (data mais antiga) + período analisado
  const entradasEstrategicas = (entradas || []).filter((e) => ehEstrategica(e.origem))
  const codigosEstrategicos = new Set<string>()
  const mapaEntrada = new Map<string, { descricao: string; dataEntrada: string | null }>()
  let minData: string | null = null
  let maxData: string | null = null
  for (const e of entradasEstrategicas) {
    codigosEstrategicos.add(e.codigo)
    if (e.data_emissao) {
      if (!minData || e.data_emissao < minData) minData = e.data_emissao
      if (!maxData || e.data_emissao > maxData) maxData = e.data_emissao
    }
    const ex = mapaEntrada.get(e.codigo)
    if (ex) {
      if (!ex.descricao && e.descricao) ex.descricao = e.descricao
      if (e.data_emissao && (!ex.dataEntrada || e.data_emissao < ex.dataEntrada)) ex.dataEntrada = e.data_emissao
    } else {
      mapaEntrada.set(e.codigo, { descricao: e.descricao || "", dataEntrada: e.data_emissao || null })
    }
  }

  // Saídas estratégicas (a NF deu entrada como estratégica)
  const saidasEstrategicas = (saidas || []).filter((s) => ehEstrategica(mapaOrigem.get(s.nota_fiscal)))
  const codigosComSaida = new Set<string>((saidas || []).map((s) => s.codigo))

  // Itens sem utilização (top 10 mais antigos)
  const listaSemUso = [...mapaEntrada.entries()]
    .filter(([codigo]) => !codigosComSaida.has(codigo))
    .map(([, v]) => ({ descricao: v.descricao, dias: calcularDias(v.dataEntrada) }))
    .sort((a, b) => b.dias - a.dias)
  const topSemUso = listaSemUso.slice(0, 10)

  // Peças consumidas + equipamentos atendidos
  let pecasConsumidas = 0
  const equipSet = new Set<string>()
  for (const s of saidasEstrategicas) {
    pecasConsumidas += s.quantidade || 0
    const eq = (s.compressor || "").trim()
    if (eq) equipSet.add(eq)
  }

  // Taxa de utilização = estratégicos utilizados / total de estratégicos
  const utilizados = [...codigosEstrategicos].filter((c) => codigosComSaida.has(c)).length
  const taxaUtilizacao = codigosEstrategicos.size ? Math.round((utilizados / codigosEstrategicos.size) * 100) : 0

  const contrato = loadContrato()

  return {
    cliente: "Vale S.A.",
    contrato: contrato.numero,
    planta: contrato.localizacao,
    periodoInicio: fmtData(minData),
    periodoFim: fmtData(maxData),
    dataEmissao: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }),
    aderenciaPct,
    totalOk,
    totalAvaliaveis,
    deficitTotal,
    taxaUtilizacao,
    itensSemUso: listaSemUso.length,
    pecasConsumidas,
    equipamentosAtendidos: equipSet.size,
    abaixoMinimoPct,
    topSemUso,
  }
}

/* ------------------------------------------------------------------ */
/* API pública                                                         */
/* ------------------------------------------------------------------ */

export async function gerarRelatorioEstrategico(itens: ItemEstrategicoRelatorio[]): Promise<boolean> {
  const dados = await carregarDadosPagina1(itens)
  const paginas = paginaResumoExecutivo(dados)
  const html = montarDocumento("Relatório Gerencial de Estoque Estratégico", paginas)
  return abrirDocumento(html)
}
