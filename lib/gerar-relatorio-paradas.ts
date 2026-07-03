import type { Machine, ParadaEvento, RegistroSemanal, ParadaIndicadores } from "@/lib/types"
import { ATLAS_COPCO_LOGO_DATA_URI } from "@/lib/atlas-copco-logo"
import { ROBOTO_400, ROBOTO_500, ROBOTO_700, ROBOTO_900 } from "@/lib/roboto-font"
import { computeIndicadores } from "@/lib/parada-eventos-storage"
import { loadContrato } from "@/lib/contrato-storage"
import { buildCategoriaColorMap } from "@/lib/categoria-cores"

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

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "-"
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return "-"
    return date.toLocaleDateString("pt-BR")
  } catch {
    return "-"
  }
}

function getDiasParada(dateStr?: string): number {
  if (!dateStr) return 0
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return 0
    const today = new Date()
    const diffTime = Math.abs(today.getTime() - date.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  } catch {
    return 0
  }
}

function getDias(m: Machine): number {
  return m.tempoParada ?? getDiasParada(m.dataParada)
}

function corResponsavel(nome: string): string {
  if (nome === "Vale") return "#6b7785" // Cinza VALE
  if (nome === "Atlas") return "#0092bc" // Azul Atlas Copco
  return "#94a3b8"
}

const logoUrl = ATLAS_COPCO_LOGO_DATA_URI

/* ------------------------------------------------------------------ */
/* Componentes visuais (HTML/SVG)                                      */
/* ------------------------------------------------------------------ */

interface DonutSeg {
  label: string
  value: number
  color: string
}

function svgDonut(
  segments: DonutSeg[],
  centerTop: string,
  centerBottom: string,
  size = 128,
  thickness = 22,
): string {
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const total = segments.reduce((a, s) => a + s.value, 0) || 1
  let offset = 0
  const circles = segments
    .map((s) => {
      const len = (s.value / total) * c
      const el = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${thickness}" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${size / 2} ${size / 2})" />`
      offset += len
      return el
    })
    .join("")
  return `<div style="position:relative;width:${size}px;height:${size}px;flex:none;">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${circles}</svg>
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
      <span style="font-size:20px;font-weight:900;color:#0f2d44;line-height:1;">${escapeHtml(centerTop)}</span>
      <span style="font-size:10px;color:#5b7083;margin-top:2px;">${escapeHtml(centerBottom)}</span>
    </div>
  </div>`
}

function legend(items: { label: string; color: string; value: string }[]): string {
  return (
    `<div style="display:flex;flex-direction:column;gap:7px;">` +
    items
      .map(
        (i) => `
      <div style="display:flex;align-items:center;gap:8px;font-size:12px;">
        <span style="width:11px;height:11px;border-radius:50%;background:${i.color};display:inline-block;flex:none;"></span>
        <span style="flex:1;color:#26333f;">${escapeHtml(i.label)}</span>
        <span style="color:#5b7083;font-weight:600;white-space:nowrap;">${escapeHtml(i.value)}</span>
      </div>`,
      )
      .join("") +
    `</div>`
  )
}

function panel(titulo: string, inner: string, extraStyle = ""): string {
  return `<div style="border:1px solid #dde5ec;border-radius:8px;padding:14px 16px;background:#fff;${extraStyle}">
    <div style="font-size:12px;font-weight:800;letter-spacing:.4px;color:#15607a;text-transform:uppercase;margin-bottom:12px;">${escapeHtml(titulo)}</div>
    ${inner}
  </div>`
}

function statCard(value: string, unit: string, label: string, color: string): string {
  return `<div style="border:1px solid #dde5ec;border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:2px;">
    <div style="display:flex;align-items:baseline;gap:5px;">
      <span style="font-size:30px;font-weight:900;color:${color};line-height:1;">${escapeHtml(value)}</span>
      ${unit ? `<span style="font-size:12px;color:#5b7083;font-weight:600;">${escapeHtml(unit)}</span>` : ""}
    </div>
    <span style="font-size:11px;color:#5b7083;line-height:1.3;">${escapeHtml(label)}</span>
  </div>`
}

function reportHead(numero: string, localizacao: string, dataEmissao: string): string {
  return `<div style="display:flex;align-items:flex-start;justify-content:space-between;border-bottom:2px solid #0092bc;padding-bottom:10px;">
    <div style="display:flex;align-items:center;gap:14px;">
      <img src="${logoUrl}" alt="Atlas Copco" style="height:32px;display:block;" />
      <div style="border-left:1px solid #cdd8e1;padding-left:14px;">
        <div style="font-size:12px;font-weight:800;color:#1f2d3a;">Gestão de Máquinas Paradas</div>
        <div style="font-size:11px;color:#5b7083;">${escapeHtml(localizacao)}</div>
        <div style="font-size:11px;color:#5b7083;">Contrato: ${escapeHtml(numero)}</div>
      </div>
    </div>
    <div style="text-align:right;font-size:11px;color:#5b7083;">
      <div>Data de emissão:</div>
      <div style="font-weight:800;color:#1f2d3a;font-size:13px;">${escapeHtml(dataEmissao)}</div>
    </div>
  </div>`
}

function reportTitle(title: string, subtitle: string): string {
  return `<div style="margin:16px 0 18px;">
    <div style="font-size:26px;font-weight:900;color:#15607a;letter-spacing:.3px;">${escapeHtml(title)}</div>
    <div style="font-size:13px;color:#5b7083;margin-top:3px;">${escapeHtml(subtitle)}</div>
  </div>`
}

function pageFooter(label: string): string {
  return `<div class="pg-footer">${escapeHtml(label)}</div>`
}

function page(inner: string, footerLabel: string): string {
  return `<div class="page"><div class="page-body">${inner}</div>${pageFooter(footerLabel)}</div>`
}

const ARROW_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>`

/* ------------------------------------------------------------------ */
/* Agregações globais                                                  */
/* ------------------------------------------------------------------ */

interface Contagem {
  nome: string
  qtd: number
  pct: number
}

function contarPor(machines: Machine[], getKey: (m: Machine) => string): Contagem[] {
  const total = machines.length || 1
  const map = new Map<string, number>()
  machines.forEach((m) => {
    const k = getKey(m)
    map.set(k, (map.get(k) || 0) + 1)
  })
  return Array.from(map.entries())
    .map(([nome, qtd]) => ({ nome, qtd, pct: Math.round((qtd / total) * 100) }))
    .sort((a, b) => b.qtd - a.qtd)
}

function tabelaConsolidada(machines: Machine[], indPorMaquina: Map<string, ParadaIndicadores>): string {
  const rows = machines
    .map((m, index) => {
      const zebra = index % 2 === 0 ? "#ffffff" : "#f3f6f9"
      const ind = indPorMaquina.get(m.id)
      const dias = ind ? ind.diasTotais : getDias(m)
      const nesta = ind ? ind.diasNaCategoriaAtual : 0
      return `
        <tr style="background:${zebra};">
          <td style="padding:7px 6px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#0f2d44;">${escapeHtml(m.nome || "-")}</td>
          <td style="padding:7px 6px;border-bottom:1px solid #e2e8f0;">${escapeHtml(m.tipo || "-")}</td>
          <td style="padding:7px 6px;border-bottom:1px solid #e2e8f0;" class="wrap">${escapeHtml(m.localizacao || "-")}</td>
          <td style="padding:7px 6px;border-bottom:1px solid #e2e8f0;text-align:center;"><span style="background:#fde8e8;color:#c81e1e;font-weight:700;font-size:9px;padding:2px 6px;border-radius:10px;">Parada</span></td>
          <td style="padding:7px 6px;border-bottom:1px solid #e2e8f0;" class="wrap">${escapeHtml(m.categoriaParada || "-")}</td>
          <td style="padding:7px 6px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:700;">${dias}</td>
          <td style="padding:7px 6px;border-bottom:1px solid #e2e8f0;text-align:center;">${nesta}</td>
          <td style="padding:7px 6px;border-bottom:1px solid #e2e8f0;text-align:center;">${formatDate(m.prazoDados)}</td>
          <td style="padding:7px 6px;border-bottom:1px solid #e2e8f0;text-align:center;">${escapeHtml(m.acaoResponsavel || "-")}</td>
          <td style="padding:7px 6px;border-bottom:1px solid #e2e8f0;" class="wrap">${escapeHtml(m.responsavel || "-")}</td>
        </tr>`
    })
    .join("")

  return `<table>
    <colgroup>
      <col style="width:11%" /><col style="width:9%" /><col style="width:16%" /><col style="width:8%" />
      <col style="width:15%" /><col style="width:8%" /><col style="width:8%" /><col style="width:9%" />
      <col style="width:6%" /><col style="width:16%" />
    </colgroup>
    <thead>
      <tr>
        <th>TAG</th><th>Modelo</th><th>Localização</th><th class="center">Status</th>
        <th>Categoria</th><th class="center">Dias Parado</th><th class="center">Nesta Categoria</th>
        <th class="center">Prazo</th><th class="center">Ação</th><th>Responsável</th>
      </tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan="10" style="padding:20px;text-align:center;color:#8094a4;">Nenhuma máquina parada encontrada.</td></tr>`}
    </tbody>
  </table>`
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
  @page { size: A4 portrait; margin: 0; }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  html, body {
    font-family:"ReportRoboto", Arial, Helvetica, sans-serif;
    font-synthesis:none;
    font-variant-ligatures:none;
    font-feature-settings:"liga" 0,"clig" 0,"dlig" 0,"hlig" 0;
    text-rendering:geometricPrecision;
    -webkit-font-smoothing:antialiased;
    color:#1f2d3a;
    margin:0;
    padding:0;
    background:#e9edf1;
  }
  body * { font-family:inherit; font-variant-ligatures:none; font-feature-settings:"liga" 0,"clig" 0,"dlig" 0,"hlig" 0; }
  .page {
    width:210mm;
    min-height:297mm;
    background:#fff;
    position:relative;
    margin:0 auto 8mm;
    page-break-after:always;
    break-after:page;
    box-shadow:0 2px 12px rgba(0,0,0,.15);
    overflow:hidden;
  }
  .page:last-child { page-break-after:auto; margin-bottom:0; }
  .page-body { padding:14mm 12mm 22mm; }
  .pg-footer {
    position:absolute; left:0; right:0; bottom:0;
    background:#0092bc; color:#fff; text-align:center;
    font-size:11px; font-weight:600; padding:7px;
  }
  table { width:100%; border-collapse:collapse; font-size:10px; table-layout:fixed; }
  td, th { word-break:keep-all; overflow-wrap:normal; vertical-align:top; }
  td.wrap, th.wrap { overflow-wrap:break-word; }
  thead { display:table-header-group; }
  tbody tr { page-break-inside:avoid; break-inside:avoid; }
  thead th { background:#0c2c44; color:#fff; text-align:left; padding:8px 6px; font-size:10px; font-weight:700; }
  thead th.center { text-align:center; }
  @media print { body { background:#fff; } .page { margin:0; box-shadow:none; } }
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
  const printWindow = window.open("", "_blank", "width=1000,height=800")
  if (!printWindow) return false
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  return true
}

interface RelatorioOptions {
  localizacao?: string
  contrato?: string
}

function dataEmissaoFmt(): string {
  return new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

/* ------------------------------------------------------------------ */
/* RELATÓRIO EXECUTIVO (2 páginas)                                     */
/* ------------------------------------------------------------------ */

export function gerarRelatorioExecutivo(
  machines: Machine[],
  eventos: ParadaEvento[] = [],
  registros: RegistroSemanal[] = [],
  _options: RelatorioOptions = {},
): boolean {
  const contrato = loadContrato()
  const dataEmissao = dataEmissaoFmt()
  const total = machines.length

  const eventosPorMaquina = agruparEventos(eventos)
  const indPorMaquina = new Map<string, ParadaIndicadores>()
  machines.forEach((m) => indPorMaquina.set(m.id, computeIndicadores(eventosPorMaquina.get(m.id) || [], m, registros)))

  const diasArr = machines.map(getDias)
  const tempoMedio = total ? Math.round(diasArr.reduce((a, b) => a + b, 0) / total) : 0
  const maior = total ? Math.max(...diasArr) : 0

  const porCategoria = contarPor(machines, (m) => m.categoriaParada || "Sem categoria")
  const porResponsavel = contarPor(machines, (m) => m.acaoResponsavel || "Não definido")
  const catColor = buildCategoriaColorMap(porCategoria.map((c) => c.nome))
  const topCategoria = porCategoria[0]

  const cards = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px;">
    ${statCard(String(total), "", "Máquinas Paradas", "#c81e1e")}
    ${statCard(String(tempoMedio), "dias", "Tempo médio de parada", "#d97706")}
    ${statCard(String(maior), "dias", "Maior parada registrada", "#c81e1e")}
    ${statCard(topCategoria ? String(topCategoria.qtd) : "0", "máquinas", topCategoria ? `Na categoria ${topCategoria.nome}` : "Sem categoria", "#0092bc")}
  </div>`

  const donutCat = svgDonut(
    porCategoria.map((c) => ({ label: c.nome, value: c.qtd, color: catColor.get(c.nome)! })),
    String(total),
    "máquinas",
  )
  const legendCat = legend(porCategoria.map((c) => ({ label: c.nome, color: catColor.get(c.nome)!, value: `${c.qtd} (${c.pct}%)` })))

  const donutResp = svgDonut(
    porResponsavel.map((r) => ({ label: r.nome, value: r.qtd, color: corResponsavel(r.nome) })),
    String(total),
    "máquinas",
  )
  const legendResp = legend(porResponsavel.map((r) => ({ label: r.nome, color: corResponsavel(r.nome), value: `${r.qtd} (${r.pct}%)` })))

  const painelDupla = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px;">
    ${panel("Resumo por Categoria", `<div style="display:flex;align-items:center;gap:16px;">${donutCat}<div style="flex:1;">${legendCat}</div></div>`)}
    ${panel("Resumo por Responsável", `<div style="display:flex;align-items:center;gap:16px;">${donutResp}<div style="flex:1;">${legendResp}</div></div>`)}
  </div>`

  const top5 = [...machines]
    .map((m) => ({ m, dias: indPorMaquina.get(m.id)?.diasTotais ?? getDias(m) }))
    .sort((a, b) => b.dias - a.dias)
    .slice(0, 5)
  const top5Rows = top5
    .map(
      (item, i) => `
      <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f3f6f9"};">
        <td style="padding:8px 6px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:800;color:#0092bc;">${i + 1}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#0f2d44;">${escapeHtml(item.m.nome || "-")}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #e2e8f0;">${escapeHtml(item.m.tipo || "-")}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #e2e8f0;" class="wrap">${escapeHtml(item.m.localizacao || "-")}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:700;">${item.dias} dias</td>
        <td style="padding:8px 6px;border-bottom:1px solid #e2e8f0;" class="wrap">${escapeHtml(item.m.categoriaParada || "-")}</td>
      </tr>`,
    )
    .join("")
  const top5Tabela = panel(
    "Top 5 maiores paradas",
    `<table>
      <colgroup><col style="width:9%"/><col style="width:15%"/><col style="width:16%"/><col style="width:30%"/><col style="width:12%"/><col style="width:18%"/></colgroup>
      <thead><tr><th class="center">Posição</th><th>TAG</th><th>Modelo</th><th>Localização</th><th class="center">Dias Parado</th><th>Categoria Atual</th></tr></thead>
      <tbody>${top5Rows}</tbody>
    </table>`,
  )

  const pagina1 = page(
    reportHead(contrato.numero, contrato.localizacao, dataEmissao) +
      reportTitle("RELATÓRIO EXECUTIVO", "Visão geral das máquinas paradas") +
      cards +
      painelDupla +
      top5Tabela,
    "Relatório Executivo - Página 1 de 2",
  )

  const pagina2 = page(
    reportHead(contrato.numero, contrato.localizacao, dataEmissao) +
      reportTitle("RELATÓRIO EXECUTIVO", "Tabela consolidada de máquinas paradas") +
      tabelaConsolidada(machines, indPorMaquina),
    "Relatório Executivo - Página 2 de 2",
  )

  return abrirDocumento(montarDocumento("Relatório Executivo - Máquinas Paradas", pagina1 + pagina2))
}

/* ------------------------------------------------------------------ */
/* RELATÓRIO DETALHADO (várias páginas)                                */
/* ------------------------------------------------------------------ */

export function gerarRelatorioDetalhado(
  machines: Machine[],
  eventos: ParadaEvento[] = [],
  registros: RegistroSemanal[] = [],
  _options: RelatorioOptions = {},
): boolean {
  const contrato = loadContrato()
  const dataEmissao = dataEmissaoFmt()
  const total = machines.length
  const totalPaginas = 2 + machines.length

  const eventosPorMaquina = agruparEventos(eventos)
  const indPorMaquina = new Map<string, ParadaIndicadores>()
  machines.forEach((m) => indPorMaquina.set(m.id, computeIndicadores(eventosPorMaquina.get(m.id) || [], m, registros)))

  const diasArr = machines.map((m) => indPorMaquina.get(m.id)?.diasTotais ?? getDias(m))
  const tempoMedio = total ? Math.round(diasArr.reduce((a, b) => a + b, 0) / total) : 0
  const maior = total ? Math.max(...diasArr) : 0
  const menor = total ? Math.min(...diasArr) : 0

  const porCategoria = contarPor(machines, (m) => m.categoriaParada || "Sem categoria")
  const porResponsavel = contarPor(machines, (m) => m.acaoResponsavel || "Não definido")
  const catColor = buildCategoriaColorMap(porCategoria.map((c) => c.nome))

  /* ---------- Página 1: Resumo Geral ---------- */
  const resumoGeral = panel(
    "Resumo Geral",
    `<div style="display:flex;flex-direction:column;gap:16px;">
      ${resumoLinha(String(total), "", "Máquinas Paradas", "#c81e1e")}
      ${resumoLinha(String(tempoMedio), "dias", "Tempo médio de parada", "#d97706")}
      ${resumoLinha(String(maior), "dias", "Maior parada registrada", "#c81e1e")}
      ${resumoLinha(String(menor), "dias", "Menor parada registrada", "#0092bc")}
    </div>`,
  )

  const donutCat = svgDonut(
    porCategoria.map((c) => ({ label: c.nome, value: c.qtd, color: catColor.get(c.nome)! })),
    String(total),
    "máquinas",
    116,
    20,
  )
  const legendCat = legend(porCategoria.map((c) => ({ label: c.nome, color: catColor.get(c.nome)!, value: `${c.qtd} (${c.pct}%)` })))
  const donutResp = svgDonut(
    porResponsavel.map((r) => ({ label: r.nome, value: r.qtd, color: corResponsavel(r.nome) })),
    String(total),
    "máquinas",
    116,
    20,
  )
  const legendResp = legend(porResponsavel.map((r) => ({ label: r.nome, color: corResponsavel(r.nome), value: `${r.qtd} (${r.pct}%)` })))

  const colDireita = `<div style="display:flex;flex-direction:column;gap:14px;">
    ${panel("Resumo por Categoria", `<div style="display:flex;align-items:center;gap:16px;">${donutCat}<div style="flex:1;">${legendCat}</div></div>`)}
    ${panel("Resumo por Responsável", `<div style="display:flex;align-items:center;gap:16px;">${donutResp}<div style="flex:1;">${legendResp}</div></div>`)}
  </div>`

  const gridTopo = `<div style="display:grid;grid-template-columns:1fr 1.3fr;gap:14px;margin-bottom:16px;">
    ${resumoGeral}
    ${colDireita}
  </div>`

  const infoRelatorio = panel(
    "Informações do Relatório",
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 24px;font-size:12px;">
      ${infoItem("Contrato", contrato.numero)}
      ${infoItem("Total de registros", `${total} máquinas`)}
      ${infoItem("Mina", contrato.localizacao)}
      ${infoItem("Período dos dados", "Último registro semanal")}
      ${infoItem("Data de emissão", dataEmissao)}
    </div>`,
  )

  const pagina1 = page(
    reportHead(contrato.numero, contrato.localizacao, dataEmissao) +
      reportTitle("RELATÓRIO DETALHADO", "Visão geral das máquinas paradas") +
      gridTopo +
      infoRelatorio,
    `Relatório Detalhado - Página 1 de ${totalPaginas}`,
  )

  const pagina2 = page(
    reportHead(contrato.numero, contrato.localizacao, dataEmissao) +
      reportTitle("RELATÓRIO DETALHADO", "Tabela consolidada de máquinas paradas") +
      tabelaConsolidada(machines, indPorMaquina),
    `Relatório Detalhado - Página 2 de ${totalPaginas}`,
  )

  const paginasMaquinas = machines
    .map((m, i) => {
      const ind = indPorMaquina.get(m.id)!
      return page(paginaMaquina(m, ind), `Relatório Detalhado - Página ${i + 3} de ${totalPaginas}`)
    })
    .join("")

  return abrirDocumento(
    montarDocumento("Relatório Detalhado - Máquinas Paradas", pagina1 + pagina2 + paginasMaquinas),
  )
}

/* ---------- Blocos do detalhado ---------- */

function resumoLinha(value: string, unit: string, label: string, color: string): string {
  return `<div style="display:flex;align-items:baseline;gap:6px;">
    <span style="font-size:26px;font-weight:900;color:${color};line-height:1;min-width:52px;">${escapeHtml(value)}</span>
    ${unit ? `<span style="font-size:11px;color:#5b7083;font-weight:600;">${escapeHtml(unit)}</span>` : ""}
    <span style="font-size:12px;color:#45586a;margin-left:4px;">${escapeHtml(label)}</span>
  </div>`
}

function infoItem(label: string, value: string): string {
  return `<div><span style="color:#5b7083;">${escapeHtml(label)}:</span> <span style="font-weight:700;color:#1f2d3a;">${escapeHtml(value)}</span></div>`
}

function paginaMaquina(m: Machine, ind: ParadaIndicadores): string {
  const catColor = buildCategoriaColorMap(ind.porCategoria.map((c) => c.nome))

  const cabecalho = `<div style="display:flex;align-items:flex-start;justify-content:space-between;border-bottom:2px solid #0092bc;padding-bottom:10px;margin-bottom:16px;">
    <div>
      <div style="font-size:24px;font-weight:900;color:#15607a;">${escapeHtml(m.nome || "-")}</div>
      <div style="font-size:13px;color:#5b7083;margin-top:2px;">${escapeHtml(m.tipo || "-")} | ${escapeHtml(m.localizacao || "-")}</div>
    </div>
    <span style="border:1px solid #f0b4b4;color:#c81e1e;font-weight:700;font-size:12px;padding:5px 12px;border-radius:6px;">Status: Parada</span>
  </div>`

  const dadosAtuais = panel(
    "Dados Atuais",
    `<div style="display:flex;flex-direction:column;gap:8px;font-size:12px;">
      ${dadoLinha("Categoria atual", ind.categoriaAtual || "-")}
      ${dadoLinha("Dias parado", `${ind.diasTotais} dias`)}
      ${dadoLinha("Nesta categoria", `${ind.diasNaCategoriaAtual} dias`)}
      ${dadoLinha("Responsável (Ação)", m.acaoResponsavel || "-")}
      ${dadoLinha("Responsável (Interno)", m.responsavel || "-")}
      ${dadoLinha("Prazo", formatDate(m.prazoDados))}
    </div>`,
  )

  const respBars =
    ind.porResponsavel.length === 0
      ? `<p style="font-size:12px;color:#5b7083;">Sem dados.</p>`
      : `<div style="display:flex;flex-direction:column;gap:12px;">` +
        ind.porResponsavel
          .map(
            (r) => `<div>
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
            <span style="font-weight:600;">${escapeHtml(r.nome)}</span>
            <span style="color:#5b7083;">${r.dias} dias (${r.percentual}%)</span>
          </div>
          <div style="height:8px;width:100%;border-radius:6px;background:#eef2f5;overflow:hidden;">
            <div style="height:100%;border-radius:6px;width:${r.percentual}%;background:${corResponsavel(r.nome)};"></div>
          </div>
        </div>`,
          )
          .join("") +
        `</div>`
  const responsabilidade = panel("Responsabilidade Acumulada", respBars)

  const observacao = panel(
    "Observação Atual",
    `<p style="font-size:12px;color:#45586a;line-height:1.5;margin:0;">${escapeHtml(m.motivoParada || "Sem observação registrada.")}</p>`,
  )

  const donut = svgDonut(
    ind.porCategoria.map((c) => ({ label: c.nome, value: c.dias, color: catColor.get(c.nome)! })),
    String(ind.diasTotais),
    "dias",
    116,
    20,
  )
  const legendCat = legend(
    ind.porCategoria.map((c) => ({ label: c.nome, color: catColor.get(c.nome)!, value: `${c.dias} dias (${c.percentual}%)` })),
  )
  const resumoCategoria = panel(
    "Resumo por Categoria",
    ind.porCategoria.length === 0
      ? `<p style="font-size:12px;color:#5b7083;">Sem dados.</p>`
      : `<div style="display:flex;align-items:center;gap:16px;">${donut}<div style="flex:1;">${legendCat}</div></div>`,
  )

  const gridTopo = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
    <div style="display:flex;flex-direction:column;gap:14px;">${dadosAtuais}${observacao}</div>
    <div style="display:flex;flex-direction:column;gap:14px;">${responsabilidade}${resumoCategoria}</div>
  </div>`

  const timeline = panel("Linha do Tempo da Parada", timelineHtml(ind, catColor))

  return cabecalho + gridTopo + timeline
}

function dadoLinha(label: string, value: string): string {
  return `<div style="display:flex;gap:8px;">
    <span style="color:#5b7083;min-width:130px;">${escapeHtml(label)}:</span>
    <span style="font-weight:700;color:#1f2d3a;">${escapeHtml(value)}</span>
  </div>`
}

function timelineHtml(ind: ParadaIndicadores, catColor: Map<string, string>): string {
  if (ind.etapas.length === 0) return `<p style="font-size:12px;color:#5b7083;">Sem histórico registrado.</p>`
  // Ordem igual à do app: do mais atual (esquerda) ao mais antigo (direita).
  const etapasOrdenadas = ind.etapas.slice().reverse()
  const nodes = etapasOrdenadas
    .map((e, i) => {
      const nomeCat = e.evento.categoria || "Sem categoria"
      const cor = catColor.get(nomeCat) || "#64748b"
      const arrow =
        i < etapasOrdenadas.length - 1
          ? `<div style="display:flex;align-items:center;padding-top:8px;color:#94a3b8;flex:none;">${ARROW_SVG}</div>`
          : ""
      return `<div style="display:flex;align-items:flex-start;">
        <div style="display:flex;flex-direction:column;align-items:center;width:88px;text-align:center;">
          <span style="width:26px;height:26px;border-radius:50%;background:${cor};display:block;${e.atual ? `box-shadow:0 0 0 2px #fff,0 0 0 4px ${cor};` : ""}"></span>
          <span style="font-size:10px;color:#5b7083;margin-top:7px;">${formatDate(e.dataInicio)}</span>
          <span style="font-size:10px;font-weight:800;color:#26333f;line-height:1.2;margin-top:3px;">${escapeHtml(nomeCat)}</span>
          <span style="font-size:10px;color:#5b7083;margin-top:2px;">${escapeHtml(e.evento.acao || e.evento.responsavel || "-")}</span>
          <span style="font-size:11px;font-weight:800;color:${cor};margin-top:4px;">${e.dias} dias${e.atual ? " (atual)" : ""}</span>
        </div>
        ${arrow}
      </div>`
    })
    .join("")
  return `<div style="display:flex;flex-wrap:wrap;gap:4px 2px;align-items:flex-start;">${nodes}</div>`
}

/* ------------------------------------------------------------------ */
/* Helpers compartilhados                                              */
/* ------------------------------------------------------------------ */

function agruparEventos(eventos: ParadaEvento[]): Map<string, ParadaEvento[]> {
  const map = new Map<string, ParadaEvento[]>()
  for (const ev of eventos) {
    const arr = map.get(ev.machineId)
    if (arr) arr.push(ev)
    else map.set(ev.machineId, [ev])
  }
  return map
}
