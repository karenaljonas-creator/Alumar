import type { Machine, ParadaEvento, RegistroSemanal, ParadaIndicadores } from "@/lib/types"
import { ATLAS_COPCO_LOGO_DATA_URI } from "@/lib/atlas-copco-logo"
import { ROBOTO_400, ROBOTO_500, ROBOTO_700, ROBOTO_900 } from "@/lib/roboto-font"
import { computeIndicadores } from "@/lib/parada-eventos-storage"
import { loadContrato } from "@/lib/contrato-storage"
import { buildCategoriaColorMap } from "@/lib/categoria-cores"
import { calculateStats } from "@/lib/machine-utils"

const META_DISPONIBILIDADE = 90
const AZUL_NAVY = "#0c2c44"
const AZUL_ATLAS = "#0092bc"

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

function page(inner: string, footerLabel: string, landscape = false): string {
  return `<div class="page${landscape ? " landscape" : ""}"><div class="page-body">${inner}</div>${pageFooter(footerLabel)}</div>`
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
/* Componentes do dashboard (Página 1 - paisagem)                      */
/* ------------------------------------------------------------------ */

function panelCompact(titulo: string, inner: string, extraStyle = ""): string {
  return `<div style="border:1px solid #dde5ec;border-radius:8px;padding:10px 12px;background:#fff;display:flex;flex-direction:column;${extraStyle}">
    <div style="font-size:10px;font-weight:800;letter-spacing:.4px;color:#15607a;text-transform:uppercase;margin-bottom:8px;">${escapeHtml(titulo)}</div>
    ${inner}
  </div>`
}

/** Card azul-navy da esquerda: disponibilidade física, Vale vs Atlas, contratual. */
function blueMetricCard(
  dispFisica: number,
  meta: number,
  countVale: number,
  countAtlas: number,
  dispContrato: number,
): string {
  const fmt = (n: number) => n.toFixed(1).replace(".", ",")
  return `<div style="background:${AZUL_NAVY};border-radius:10px;color:#fff;padding:18px 16px;display:flex;flex-direction:column;justify-content:space-between;gap:14px;height:100%;">
    <div style="text-align:center;">
      <div style="font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:rgba(255,255,255,.8);line-height:1.25;">Disponibilidade da Planta<br/>(Física)</div>
      <div style="font-size:52px;font-weight:900;line-height:1;margin-top:8px;">${fmt(dispFisica)}%</div>
      <div style="font-size:13px;font-weight:700;color:rgba(255,255,255,.9);margin-top:8px;">Meta: ${meta}%</div>
      <div style="border-bottom:2px dashed #f5b301;margin-top:12px;"></div>
    </div>
    <div>
      <div style="text-align:center;font-size:11px;color:rgba(255,255,255,.8);margin-bottom:10px;">Principais responsáveis pela indisponibilidade</div>
      <div style="display:flex;align-items:stretch;justify-content:center;gap:6px;">
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;">
          <span style="font-size:34px;font-weight:900;line-height:1;color:#e8503a;">${countVale}</span>
          <span style="font-size:10px;color:rgba(255,255,255,.8);text-align:center;">máquinas paradas</span>
          <span style="font-size:10px;font-weight:700;background:#e8503a;color:#fff;border-radius:4px;padding:2px 10px;">Ação Vale</span>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 4px;">
          <div style="width:1px;flex:1;background:rgba(255,255,255,.3);"></div>
          <div style="width:30px;height:30px;border-radius:50%;border:1px solid rgba(255,255,255,.4);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:rgba(255,255,255,.85);margin:3px 0;">VS</div>
          <div style="width:1px;flex:1;background:rgba(255,255,255,.3);"></div>
        </div>
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;">
          <span style="font-size:34px;font-weight:900;line-height:1;color:#bfe6f2;">${countAtlas}</span>
          <span style="font-size:10px;color:rgba(255,255,255,.8);text-align:center;">máquinas paradas</span>
          <span style="font-size:10px;font-weight:700;background:#12466b;color:#fff;border-radius:4px;padding:2px 10px;">Ação Atlas</span>
        </div>
      </div>
    </div>
    <div style="display:flex;align-items:center;justify-content:center;gap:12px;border-top:1px solid rgba(255,255,255,.25);padding-top:12px;">
      <div style="text-align:center;">
        <div style="font-size:10px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:rgba(255,255,255,.8);line-height:1.3;">Disponibilidade<br/>Contratual Atlas</div>
        <div style="font-size:30px;font-weight:900;line-height:1;margin-top:4px;">${fmt(dispContrato)}%</div>
      </div>
    </div>
  </div>`
}

/** Barras horizontais (ex.: localização das máquinas paradas). */
function hbars(items: { label: string; value: number }[]): string {
  if (items.length === 0) return `<p style="font-size:11px;color:#5b7083;margin:0;">Sem dados.</p>`
  const max = Math.max(...items.map((i) => i.value), 1)
  return `<div style="display:flex;flex-direction:column;gap:8px;">${items
    .map((i) => {
      const w = Math.max(6, Math.round((i.value / max) * 100))
      return `<div style="display:flex;align-items:center;gap:8px;">
        <span style="width:96px;font-size:10px;color:#26333f;text-align:right;line-height:1.15;flex:none;">${escapeHtml(i.label)}</span>
        <div style="flex:1;height:14px;background:#eef2f5;border-radius:3px;overflow:hidden;">
          <div style="height:100%;width:${w}%;background:${AZUL_ATLAS};border-radius:3px;"></div>
        </div>
        <span style="width:16px;font-size:11px;font-weight:700;color:#0f2d44;flex:none;">${i.value}</span>
      </div>`
    })
    .join("")}</div>`
}

/** Mini gráfico de linha da evolução da disponibilidade com linha de meta. */
function svgLineChart(points: { label: string; value: number }[], meta = 90): string {
  if (points.length === 0) return `<p style="font-size:11px;color:#5b7083;margin:0;">Sem histórico disponível.</p>`
  const W = 430
  const H = 120
  const padL = 26
  const padR = 12
  const padT = 14
  const padB = 20
  const minY = 80
  const maxY = 100
  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const x = (i: number) => padL + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW)
  const y = (v: number) => padT + (1 - (Math.min(maxY, Math.max(minY, v)) - minY) / (maxY - minY)) * plotH
  const gridLines = [80, 85, 90, 95, 100]
    .map((g) => {
      const gy = y(g)
      return `<line x1="${padL}" y1="${gy}" x2="${W - padR}" y2="${gy}" stroke="#e2e8f0" stroke-width="1"/>
        <text x="${padL - 4}" y="${gy + 3}" text-anchor="end" font-size="7" fill="#8094a4">${g}%</text>`
    })
    .join("")
  const metaY = y(meta)
  const metaLine = `<line x1="${padL}" y1="${metaY}" x2="${W - padR}" y2="${metaY}" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="5 4"/>`
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ")
  const dots = points
    .map(
      (p, i) =>
        `<circle cx="${x(i).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="2.6" fill="#fff" stroke="${AZUL_ATLAS}" stroke-width="1.5"/>
        <text x="${x(i).toFixed(1)}" y="${(y(p.value) - 6).toFixed(1)}" text-anchor="middle" font-size="7" font-weight="700" fill="#0f2d44">${p.value.toFixed(1).replace(".", ",")}%</text>`,
    )
    .join("")
  const labels = points
    .map((p, i) => `<text x="${x(i).toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="7" fill="#5b7083">${escapeHtml(p.label)}</text>`)
    .join("")
  return `<div>
    <svg width="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
      ${gridLines}${metaLine}
      <path d="${linePath}" fill="none" stroke="${AZUL_ATLAS}" stroke-width="2"/>
      ${dots}${labels}
    </svg>
    <div style="display:flex;justify-content:center;gap:16px;margin-top:4px;font-size:8px;color:#5b7083;">
      <span style="display:flex;align-items:center;gap:4px;"><span style="width:14px;height:2px;background:${AZUL_ATLAS};display:inline-block;"></span>Disponibilidade contratual (Atlas)</span>
      <span style="display:flex;align-items:center;gap:4px;"><span style="width:14px;height:0;border-top:2px dashed #f59e0b;display:inline-block;"></span>Meta contratual (${meta}%)</span>
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
  @page { size: A4 portrait; margin: 0; }
  @page landscapePg { size: A4 landscape; margin: 0; }
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
  .page.landscape { width:297mm; min-height:210mm; page:landscapePg; }
  .page-body { padding:14mm 12mm 22mm; }
  .page.landscape .page-body { padding:9mm 10mm 16mm; height:210mm; display:flex; flex-direction:column; }
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

  /* ---------- Página 1: Painel de Controle (paisagem) ---------- */
  // Disponibilidade física/contratual: usa o último snapshot semanal (planta
  // completa). Se não houver histórico, cai para as máquinas recebidas.
  const registrosOrdenados = [...registros].sort(
    (a, b) => new Date(a.dataRegistro).getTime() - new Date(b.dataRegistro).getTime(),
  )
  const ultimoRegistro = registrosOrdenados[registrosOrdenados.length - 1]
  const statsBase = calculateStats(ultimoRegistro?.maquinas?.length ? ultimoRegistro.maquinas : machines)

  const countVale = machines.filter((m) => m.acaoResponsavel === "Vale").length
  const countAtlas = machines.filter((m) => m.acaoResponsavel === "Atlas").length

  // Evolução da disponibilidade contratual (últimas semanas).
  const evolucao = registrosOrdenados.slice(-8).map((r) => ({
    label: `S${r.semana?.split("-W")[1] || "?"}`,
    value: Number(calculateStats(r.maquinas || []).disponibilidadeContrato.toFixed(1)),
  }))

  // Localização das máquinas paradas (top 5).
  const porLocalizacao = contarPor(machines, (m) => m.localizacao || "Sem localização").slice(0, 5)

  const cardAzul = blueMetricCard(
    statsBase.disponibilidade,
    META_DISPONIBILIDADE,
    countVale,
    countAtlas,
    statsBase.disponibilidadeContrato,
  )

  // Resumo geral
  const resumoGeral = panelCompact(
    "Resumo Geral",
    `<div style="display:flex;flex-direction:column;gap:9px;">
      ${resumoLinha(String(total), "", "Máquinas Paradas", "#c81e1e")}
      ${resumoLinha(String(tempoMedio), "dias", "Tempo médio de parada", "#d97706")}
      ${resumoLinha(String(maior), "dias", "Maior parada registrada", "#c81e1e")}
      ${resumoLinha(String(menor), "dias", "Menor parada registrada", AZUL_ATLAS)}
    </div>`,
  )

  // Top 5 máquinas críticas
  const top5 = [...machines]
    .map((m) => ({ m, dias: indPorMaquina.get(m.id)?.diasTotais ?? getDias(m) }))
    .sort((a, b) => b.dias - a.dias)
    .slice(0, 5)
  const top5Rows = top5
    .map(
      (item) => `<tr>
        <td style="padding:5px 6px;border-bottom:1px solid #e8edf1;font-weight:700;color:#0f2d44;">${escapeHtml(item.m.nome || "-")}</td>
        <td style="padding:5px 6px;border-bottom:1px solid #e8edf1;" class="wrap">${escapeHtml(item.m.localizacao || "-")}</td>
        <td style="padding:5px 6px;border-bottom:1px solid #e8edf1;text-align:center;font-weight:700;color:#c81e1e;white-space:nowrap;">${item.dias} dias</td>
        <td style="padding:5px 6px;border-bottom:1px solid #e8edf1;text-align:center;">${escapeHtml(item.m.acaoResponsavel || "-")}</td>
        <td style="padding:5px 6px;border-bottom:1px solid #e8edf1;text-align:center;white-space:nowrap;">${formatDate(item.m.prazoDados)}</td>
      </tr>`,
    )
    .join("")
  const top5Panel = panelCompact(
    "Top 5 Máquinas Críticas",
    `<table style="font-size:10px;">
      <colgroup><col style="width:26%"/><col style="width:24%"/><col style="width:18%"/><col style="width:16%"/><col style="width:16%"/></colgroup>
      <thead><tr>
        <th style="background:transparent;color:#5b7083;border-bottom:1px solid #cdd8e1;padding:4px 6px;">Equipamento</th>
        <th style="background:transparent;color:#5b7083;border-bottom:1px solid #cdd8e1;padding:4px 6px;">Localização</th>
        <th style="background:transparent;color:#5b7083;border-bottom:1px solid #cdd8e1;padding:4px 6px;text-align:center;">Dias parado</th>
        <th style="background:transparent;color:#5b7083;border-bottom:1px solid #cdd8e1;padding:4px 6px;text-align:center;">Ação</th>
        <th style="background:transparent;color:#5b7083;border-bottom:1px solid #cdd8e1;padding:4px 6px;text-align:center;">Atualização</th>
      </tr></thead>
      <tbody>${top5Rows || `<tr><td colspan="5" style="padding:12px;text-align:center;color:#8094a4;">Sem dados.</td></tr>`}</tbody>
    </table>`,
    "flex:1;",
  )

  const evolucaoPanel = panelCompact(
    "Evolução da Disponibilidade ao Longo das Semanas (Meta: 90%)",
    svgLineChart(evolucao, META_DISPONIBILIDADE),
    "flex:1;",
  )

  // Donuts
  const donutCat = svgDonut(
    porCategoria.map((c) => ({ label: c.nome, value: c.qtd, color: catColor.get(c.nome)! })),
    String(total),
    "máquinas",
    92,
    16,
  )
  const legendCat = legend(porCategoria.map((c) => ({ label: c.nome, color: catColor.get(c.nome)!, value: `${c.qtd} (${c.pct}%)` })))
  const donutResp = svgDonut(
    porResponsavel.map((r) => ({ label: r.nome, value: r.qtd, color: corResponsavel(r.nome) })),
    String(total),
    "máquinas",
    92,
    16,
  )
  const legendResp = legend(porResponsavel.map((r) => ({ label: r.nome, color: corResponsavel(r.nome), value: `${r.qtd} (${r.pct}%)` })))

  const causaPanel = panelCompact(
    "Máquinas Paradas por Causa",
    `<div style="display:flex;align-items:center;gap:12px;">${donutCat}<div style="flex:1;min-width:0;">${legendCat}</div></div>`,
  )
  const localizacaoPanel = panelCompact("Localização das Máquinas Paradas", hbars(porLocalizacao.map((l) => ({ label: l.nome, value: l.qtd }))), "flex:1;")
  const respPanel = panelCompact(
    "Resumo por Responsável",
    `<div style="display:flex;align-items:center;gap:12px;">${donutResp}<div style="flex:1;min-width:0;">${legendResp}</div></div>`,
  )

  const dashboard = `<div style="display:flex;flex-direction:column;gap:12px;">
    <div style="display:grid;grid-template-columns:0.85fr 1fr;gap:12px;align-items:stretch;">
      <div style="display:flex;">${cardAzul}</div>
      <div style="display:flex;flex-direction:column;gap:12px;">${resumoGeral}${causaPanel}</div>
    </div>
    ${top5Panel}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:stretch;">
      ${localizacaoPanel}${respPanel}
    </div>
    ${evolucaoPanel}
  </div>`

  const infoRelatorio = `<div style="border:1px solid #dde5ec;border-radius:8px;padding:10px 14px;background:#fff;margin-top:12px;">
    <div style="font-size:11px;font-weight:800;letter-spacing:.4px;color:#15607a;text-transform:uppercase;margin-bottom:8px;">Informações do Relatório</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px 24px;font-size:11px;">
      ${infoItem("Contrato", contrato.numero)}
      ${infoItem("Mina", contrato.localizacao)}
      ${infoItem("Data de emissão", dataEmissao)}
      ${infoItem("Total de registros", `${total} máquinas`)}
      ${infoItem("Período dos dados", "Último registro semanal")}
    </div>
  </div>`

  const pagina1 = page(
    reportHead(contrato.numero, contrato.localizacao, dataEmissao) +
      reportTitle("RELATÓRIO DETALHADO", "Visão geral das máquinas paradas") +
      dashboard +
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
      const acaoResp = [e.evento.acao, e.evento.responsavel].filter(Boolean).join(" / ") || "-"
      const observacao = (e.evento.observacao || "").trim()
      return `<div style="display:flex;align-items:flex-start;">
        <div style="display:flex;flex-direction:column;width:150px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="width:22px;height:22px;border-radius:50%;background:${cor};display:block;flex:none;${e.atual ? `box-shadow:0 0 0 2px #fff,0 0 0 4px ${cor};` : ""}"></span>
            <div style="min-width:0;">
              <div style="font-size:10px;font-weight:700;color:${cor};line-height:1.2;">${e.atual ? "Atual - Desde " : ""}${formatDate(e.dataInicio)}</div>
              <div style="font-size:10px;font-weight:800;color:#26333f;line-height:1.2;word-break:break-word;">${escapeHtml(nomeCat)}</div>
            </div>
          </div>
          <div style="margin-top:6px;">
            <div style="font-size:8px;color:#8a97a3;text-transform:uppercase;letter-spacing:.4px;">Ação / Responsável</div>
            <div style="font-size:10px;color:#26333f;line-height:1.3;word-break:break-word;">${escapeHtml(acaoResp)}</div>
          </div>
          ${
            observacao
              ? `<div style="margin-top:4px;">
            <div style="font-size:8px;color:#8a97a3;text-transform:uppercase;letter-spacing:.4px;">Observação</div>
            <div style="font-size:10px;color:#5b7083;line-height:1.3;word-break:break-word;">${escapeHtml(observacao)}</div>
          </div>`
              : ""
          }
          <span style="align-self:flex-start;font-size:10px;font-weight:800;color:#fff;background:${cor};border-radius:9px;padding:2px 8px;margin-top:6px;">${e.dias} dias${e.atual ? " (em andamento)" : ""}</span>
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
