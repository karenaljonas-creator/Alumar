import { ATLAS_COPCO_LOGO_DATA_URI } from "@/lib/atlas-copco-logo"
import { ROBOTO_400, ROBOTO_500, ROBOTO_700, ROBOTO_900 } from "@/lib/roboto-font"
import { createClient } from "@/lib/supabase/client"
import { loadContrato } from "@/lib/contrato-storage"

/* ================================================================== */
/* Relatório Gerencial de Estoque Estratégico (A4 Landscape)          */
/* Página 1 - Resumo Executivo                                        */
/* Página 2 - Estoque e Utilização                                    */
/* Página 3 - Rastreabilidade das Utilizações                         */
/* Dados cruzados de: Entrada + Saída + Estoque Estratégico           */
/* ================================================================== */

/* ---- Paleta (identidade Atlas Copco do app) ---- */
const AZUL = "#0092bc" // Atlas Copco Blue OFICIAL (--primary)
const AZUL_ESCURO = "#0a4a5f" // Atlas Copco Blue 11 (azul-petróleo escuro da paleta oficial)
const AZUL_MEDIO = "#15607a"
const AZUL_CLARO_BG = "#e6f4f9"
const AZUL_TINT = "#8fd0e6" // Atlas Copco Blue tint (segmento claro dos gráficos)
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

interface DadosPagina2 {
  cliente: string
  contrato: string
  planta: string
  periodoInicio: string
  periodoFim: string
  abaixoMinimo: {
    codigo: string
    descricao: string
    saldo: number
    minimo: number | null
    deficit: number
    sugestao: number
  }[]
  pecasConsumidas: number
  osAtendidas: number
  taxaUtilizacao: number
  topConsumidos: { descricao: string; total: number }[]
  consumoCorretiva: number
  consumoPreventiva: number
  consumoEquip: { nome: string; total: number }[]
}

interface LinhaRastreio {
  data: string
  codigo: string
  descricao: string
  quantidade: number
  equipamento: string
  os: string
  tipo: string
  origem: string
}

interface DadosPagina3 {
  periodoInicio: string
  periodoFim: string
  linhas: LinhaRastreio[]
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
    <span style="color:#ffffff;margin-top:1px;flex:none;">${ico}</span>
    <div style="display:flex;flex-direction:column;gap:1px;">
      <span style="font-size:9.5px;text-transform:uppercase;letter-spacing:.5px;color:rgba(255,255,255,.8);">${escapeHtml(rotulo)}</span>
      <span style="font-size:12px;font-weight:600;color:#ffffff;line-height:1.3;">${escapeHtml(valor)}</span>
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
          <div style="font-size:12px;font-weight:600;color:rgba(255,255,255,.85);letter-spacing:.3px;">Relatório Gerencial de</div>
          <div style="font-size:30px;font-weight:900;color:#fff;line-height:1.05;margin-top:4px;">Estoque<br/>Estratégico</div>
          <div style="font-size:11px;color:rgba(255,255,255,.85);line-height:1.4;margin-top:10px;">Monitoramento, utilização e rastreabilidade dos itens estratégicos</div>
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
/* Componentes da Página 2                                             */
/* ------------------------------------------------------------------ */

function faixaTitulo(ico: string, texto: string): string {
  return `
  <div style="display:flex;align-items:center;gap:9px;background:${AZUL};color:#fff;border-radius:8px;padding:8px 13px;">
    <span style="display:inline-flex;align-items:center;justify-content:center;flex:none;">${ico}</span>
    <span style="font-size:12.5px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;">${escapeHtml(texto)}</span>
  </div>`
}

function kpiCompacto(ico: string, valor: string, legenda: string): string {
  return `
  <div style="background:#fff;border:1px solid ${BORDA};border-radius:11px;padding:12px 13px;box-shadow:0 1px 3px rgba(15,45,68,.06);display:flex;align-items:center;gap:11px;">
    <span style="display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:9px;background:${AZUL_CLARO_BG};color:${AZUL};flex:none;">${ico}</span>
    <div style="display:flex;flex-direction:column;gap:1px;min-width:0;">
      <span style="font-size:26px;font-weight:900;color:${AZUL};line-height:1;">${escapeHtml(valor)}</span>
      <span style="font-size:10.5px;color:${TEXTO_SUAVE};line-height:1.25;">${escapeHtml(legenda)}</span>
    </div>
  </div>`
}

function barraConsumo(rank: number, item: { descricao: string; total: number }, maxTotal: number): string {
  const pct = maxTotal > 0 ? Math.max(5, Math.round((item.total / maxTotal) * 100)) : 0
  return `
  <div style="display:flex;align-items:center;gap:8px;">
    <div style="width:16px;font-size:10px;font-weight:700;color:${TEXTO_SUAVE};text-align:right;flex:none;">${rank}</div>
    <div style="width:150px;font-size:10px;color:#33475b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:none;">${escapeHtml(item.descricao || "-")}</div>
    <div style="flex:1;height:11px;background:${TRILHA};border-radius:6px;overflow:hidden;min-width:0;">
      <div style="height:100%;width:${pct}%;background:${AZUL};border-radius:6px;"></div>
    </div>
    <div style="width:36px;text-align:right;font-size:10px;font-weight:700;color:${TEXTO};flex:none;">${item.total} un</div>
  </div>`
}

function donutTipoUtilizacao(corretiva: number, preventiva: number): string {
  const total = corretiva + preventiva
  const r = 46
  const cx = 60
  const cy = 60
  const sw = 22
  const c = 2 * Math.PI * r
  const segmentos = [
    { label: "Corretiva", valor: corretiva, cor: AZUL },
    { label: "Preventiva", valor: preventiva, cor: AZUL_TINT },
  ]
  let offset = 0
  const arcos = total
    ? segmentos
        .map((s) => {
          const dash = (s.valor / total) * c
          const el = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.cor}" stroke-width="${sw}" stroke-dasharray="${dash} ${c - dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})"/>`
          offset += dash
          return el
        })
        .join("")
    : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${TRILHA}" stroke-width="${sw}"/>`

  const pctCorr = total ? Math.round((corretiva / total) * 100) : 0
  const pctPrev = total ? 100 - pctCorr : 0

  const legenda = (cor: string, label: string, pct: number, un: number) => `
    <div style="display:flex;align-items:center;gap:7px;">
      <span style="width:9px;height:9px;border-radius:50%;background:${cor};flex:none;"></span>
      <span style="font-size:10.5px;color:#33475b;">${label}<br/><strong style="color:${TEXTO};">${pct}% (${un} un)</strong></span>
    </div>`

  return `
  <div style="display:flex;align-items:center;gap:14px;">
    <div style="position:relative;width:120px;height:120px;flex:none;">
      <svg width="120" height="120" viewBox="0 0 120 120">${arcos}</svg>
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <span style="font-size:22px;font-weight:900;color:${TEXTO};line-height:1;">${total}</span>
        <span style="font-size:9.5px;color:${TEXTO_SUAVE};">Peças</span>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:12px;">
      ${legenda(AZUL, "Corretiva", pctCorr, corretiva)}
      ${legenda(AZUL_TINT, "Preventiva", pctPrev, preventiva)}
    </div>
  </div>`
}

function barrasEquipamento(items: { nome: string; total: number }[]): string {
  if (!items.length) {
    return `<div style="font-size:11px;color:${TEXTO_SUAVE};padding:16px 0;text-align:center;">Sem consumo registrado no período.</div>`
  }
  const H = 96
  const max = Math.max(1, ...items.map((i) => i.total))
  const colunas = items
    .map((i) => {
      const h = Math.max(6, Math.round((i.total / max) * H))
      return `
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;min-width:0;">
        <span style="font-size:11px;font-weight:700;color:${TEXTO};">${i.total}</span>
        <div style="width:60%;max-width:34px;height:${h}px;background:${AZUL};border-radius:4px 4px 0 0;"></div>
        <span style="font-size:8.5px;color:${TEXTO_SUAVE};text-align:center;line-height:1.15;width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(i.nome)}</span>
      </div>`
    })
    .join("")
  return `<div style="display:flex;align-items:flex-end;gap:6px;height:${H + 36}px;padding-top:6px;">${colunas}</div>`
}

/* ------------------------------------------------------------------ */
/* Página 2 - Estoque e Utilização                                     */
/* ------------------------------------------------------------------ */

function paginaEstoqueUtilizacao(d: DadosPagina2): string {
  const linhas = d.abaixoMinimo.length
    ? d.abaixoMinimo
        .map(
          (it, idx) => `
      <tr style="border-bottom:1px solid ${BORDA};">
        <td style="padding:5px 6px;color:${TEXTO_SUAVE};font-size:10px;">${idx + 1}</td>
        <td style="padding:5px 6px;color:${AZUL};font-weight:600;font-size:10px;">${escapeHtml(it.codigo)}</td>
        <td style="padding:5px 6px;font-size:10px;color:${TEXTO};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px;">${escapeHtml(it.descricao || "-")}</td>
        <td style="padding:5px 6px;text-align:center;font-size:10px;color:${TEXTO};">${it.saldo}</td>
        <td style="padding:5px 6px;text-align:center;font-size:10px;color:${TEXTO};">${it.minimo ?? "-"}</td>
        <td style="padding:5px 6px;text-align:center;font-size:10px;font-weight:700;color:#c0392b;">${it.deficit}</td>
        <td style="padding:5px 6px;text-align:center;font-size:10px;font-weight:700;color:${AZUL};">${it.sugestao}</td>
      </tr>`,
        )
        .join("")
    : `<tr><td colspan="7" style="padding:16px;text-align:center;font-size:11px;color:${TEXTO_SUAVE};">Nenhum item abaixo do mínimo.</td></tr>`

  const maxConsumo = Math.max(1, ...d.topConsumidos.map((i) => i.total))
  const listaConsumo = d.topConsumidos.length
    ? d.topConsumidos.map((i, idx) => barraConsumo(idx + 1, i, maxConsumo)).join("")
    : `<div style="font-size:11px;color:${TEXTO_SUAVE};padding:8px 0;">Nenhum item consumido no período.</div>`

  const cardBase = `background:#fff;border:1px solid ${BORDA};border-radius:12px;padding:13px 15px;box-shadow:0 1px 3px rgba(15,45,68,.06);`
  const subtitulo = `font-size:11px;font-weight:800;color:${AZUL_MEDIO};letter-spacing:.4px;text-transform:uppercase;margin-bottom:10px;`

  return `
  <div class="page">
    <!-- Cabeçalho -->
    <div style="flex:none;display:flex;align-items:stretch;">
      <div style="background:${AZUL};display:flex;align-items:center;padding:12px 16px;">
        <div style="background:#fff;border-radius:6px;padding:6px 9px;display:inline-flex;">
          <img src="${ATLAS_COPCO_LOGO_DATA_URI}" alt="Atlas Copco" style="height:20px;display:block;" />
        </div>
      </div>
      <div style="flex:1;display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:2px solid ${AZUL};">
        <div>
          <div style="font-size:19px;font-weight:900;color:${AZUL_MEDIO};letter-spacing:.3px;line-height:1.1;">ITENS ABAIXO DO MÍNIMO E UTILIZAÇÃO DO ESTOQUE ESTRATÉGICO</div>
          <div style="font-size:11px;color:${TEXTO_SUAVE};margin-top:2px;">Visão consolidada dos itens abaixo do nível mínimo e da utilização do estoque estratégico no período.</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex:none;margin-left:14px;">
          <span style="color:${AZUL};">${icone("cal", 18)}</span>
          <div style="line-height:1.2;">
            <div style="font-size:9.5px;text-transform:uppercase;letter-spacing:.4px;color:${TEXTO_SUAVE};">Período analisado</div>
            <div style="font-size:11.5px;font-weight:700;color:${AZUL};">${d.periodoInicio} a ${d.periodoFim}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Conteúdo -->
    <div style="flex:1;min-height:0;display:grid;grid-template-columns:1fr 1.35fr;gap:14px;padding:12px 14px;">
      <!-- Coluna esquerda: tabela -->
      <div style="display:flex;flex-direction:column;gap:9px;min-height:0;">
        ${faixaTitulo(icone("doc", 16), "Itens abaixo do mínimo (Top 15)")}
        <div style="${cardBase}flex:1;overflow:hidden;padding:12px;">
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:${AZUL};color:#fff;">
                <th style="padding:6px;text-align:left;font-size:9.5px;font-weight:700;">#</th>
                <th style="padding:6px;text-align:left;font-size:9.5px;font-weight:700;">Código (PN)</th>
                <th style="padding:6px;text-align:left;font-size:9.5px;font-weight:700;">Descrição</th>
                <th style="padding:6px;text-align:center;font-size:9.5px;font-weight:700;">Saldo Atual</th>
                <th style="padding:6px;text-align:center;font-size:9.5px;font-weight:700;">Mínimo</th>
                <th style="padding:6px;text-align:center;font-size:9.5px;font-weight:700;">Déficit</th>
                <th style="padding:6px;text-align:center;font-size:9.5px;font-weight:700;">Sugestão</th>
              </tr>
            </thead>
            <tbody>${linhas}</tbody>
          </table>
          <div style="font-size:9px;color:${TEXTO_SUAVE};margin-top:8px;">PN: Part Number (Código da Peça)</div>
        </div>
      </div>

      <!-- Coluna direita: utilização -->
      <div style="display:flex;flex-direction:column;gap:9px;min-height:0;">
        ${faixaTitulo(icone("trend", 16), "Utilização e consumo do estoque estratégico")}

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
          ${kpiCompacto(icone("stack"), String(d.pecasConsumidas), "Peças consumidas")}
          ${kpiCompacto(icone("doc"), String(d.osAtendidas), "OS atendidas")}
          ${kpiCompacto(icone("pie"), `${d.taxaUtilizacao}%`, "Taxa de utilização")}
        </div>

        <div style="display:grid;grid-template-columns:1.15fr 1fr;gap:10px;">
          <div style="${cardBase}">
            <div style="${subtitulo}">Top 10 itens consumidos</div>
            <div style="display:flex;flex-direction:column;gap:6px;">${listaConsumo}</div>
          </div>
          <div style="${cardBase}display:flex;flex-direction:column;">
            <div style="${subtitulo}">Consumo por tipo de utilização</div>
            <div style="flex:1;display:flex;align-items:center;">${donutTipoUtilizacao(d.consumoCorretiva, d.consumoPreventiva)}</div>
          </div>
        </div>

        <div style="${cardBase}flex:1;display:flex;flex-direction:column;min-height:0;">
          <div style="${subtitulo}">Consumo por equipamento (peças)</div>
          ${barrasEquipamento(d.consumoEquip)}
        </div>
      </div>
    </div>

    <!-- Rodapé -->
    <div class="rodape">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:6px;background:${AZUL};color:#fff;">${icone("trend", 13)}</span>
        <span style="font-size:10.5px;color:${TEXTO_SUAVE};">Manter o estoque estratégico otimizado para garantir disponibilidade e eficiência operacional.</span>
      </div>
      <div style="display:flex;align-items:center;gap:14px;">
        <span style="font-size:10.5px;font-weight:700;color:${AZUL_MEDIO};">Gestão de Estoque Estratégico</span>
        <img src="${ATLAS_COPCO_LOGO_DATA_URI}" alt="Atlas Copco" style="height:18px;display:block;" />
      </div>
    </div>
  </div>`
}

/* ------------------------------------------------------------------ */
/* Página 3 - Rastreabilidade das Utilizações                          */
/* ------------------------------------------------------------------ */

function badgeTipo(tipo: string): string {
  const t = tipo.trim().toLowerCase()
  if (t === "corretiva") {
    return `<span style="display:inline-block;padding:2px 9px;border-radius:11px;background:${AZUL_MEDIO};color:#fff;font-size:9.5px;font-weight:700;">Corretiva</span>`
  }
  if (t === "preventiva") {
    return `<span style="display:inline-block;padding:2px 9px;border-radius:11px;background:${AZUL_CLARO_BG};color:${AZUL_MEDIO};font-size:9.5px;font-weight:700;">Preventiva</span>`
  }
  return `<span style="font-size:9.5px;color:${TEXTO_SUAVE};">${escapeHtml(tipo || "-")}</span>`
}

function paginaRastreabilidade(d: DadosPagina3): string {
  const LINHAS_POR_PAGINA = 16
  const total = d.linhas.length
  const blocos: LinhaRastreio[][] = []
  if (total === 0) {
    blocos.push([])
  } else {
    for (let i = 0; i < total; i += LINHAS_POR_PAGINA) {
      blocos.push(d.linhas.slice(i, i + LINHAS_POR_PAGINA))
    }
  }

  const cabecalhoTabela = `
    <thead>
      <tr style="background:${AZUL};color:#fff;">
        <th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;">Data</th>
        <th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;">Código (PN)</th>
        <th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;">Descrição</th>
        <th style="padding:8px 10px;text-align:center;font-size:10px;font-weight:700;">Quantidade</th>
        <th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;">Equipamento</th>
        <th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;">OS</th>
        <th style="padding:8px 10px;text-align:center;font-size:10px;font-weight:700;">Tipo de utilização</th>
        <th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;">Origem</th>
      </tr>
    </thead>`

  return blocos
    .map((bloco, idxBloco) => {
      const corpo = bloco.length
        ? bloco
            .map((l, i) => {
              const zebra = i % 2 === 1 ? `background:${AZUL_CLARO_BG};` : "background:#fff;"
              return `
          <tr style="${zebra}border-bottom:1px solid ${BORDA};">
            <td style="padding:7px 10px;font-size:10px;color:${TEXTO};white-space:nowrap;">${escapeHtml(l.data)}</td>
            <td style="padding:7px 10px;font-size:10px;color:${AZUL};font-weight:600;">${escapeHtml(l.codigo)}</td>
            <td style="padding:7px 10px;font-size:10px;color:${TEXTO};max-width:230px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(l.descricao || "-")}</td>
            <td style="padding:7px 10px;font-size:10px;text-align:center;color:${TEXTO};">${l.quantidade}</td>
            <td style="padding:7px 10px;font-size:10px;color:${TEXTO};white-space:nowrap;">${escapeHtml(l.equipamento || "-")}</td>
            <td style="padding:7px 10px;font-size:10px;color:${TEXTO};white-space:nowrap;">${escapeHtml(l.os || "-")}</td>
            <td style="padding:7px 10px;text-align:center;">${badgeTipo(l.tipo)}</td>
            <td style="padding:7px 10px;font-size:9.5px;color:${TEXTO_SUAVE};white-space:nowrap;">${escapeHtml(l.origem || "-")}</td>
          </tr>`
            })
            .join("")
        : `<tr><td colspan="8" style="padding:24px;text-align:center;font-size:12px;color:${TEXTO_SUAVE};">Nenhuma utilização de item do estoque estratégico registrada no período.</td></tr>`

      const contador =
        blocos.length > 1
          ? `<span style="font-size:10.5px;color:${TEXTO_SUAVE};">Página ${idxBloco + 1} de ${blocos.length} — ${total} utilizações</span>`
          : `<span style="font-size:10.5px;color:${TEXTO_SUAVE};">${total} ${total === 1 ? "utilização registrada" : "utilizações registradas"}</span>`

      const tituloCabecalho =
        idxBloco === 0
          ? `
        <div style="flex:none;display:flex;align-items:center;gap:14px;padding:14px 18px 6px;">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:11px;background:${AZUL_CLARO_BG};color:${AZUL};flex:none;">${icone("doc", 24)}</span>
          <div>
            <div style="font-size:23px;font-weight:900;color:${AZUL_MEDIO};letter-spacing:.3px;line-height:1.05;">RASTREABILIDADE DAS UTILIZAÇÕES</div>
            <div style="font-size:11.5px;color:${TEXTO_SUAVE};margin-top:2px;">Histórico detalhado de quando, onde e como os itens do estoque estratégico foram utilizados.</div>
          </div>
        </div>`
          : `
        <div style="flex:none;display:flex;align-items:center;gap:10px;padding:14px 18px 6px;">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9px;background:${AZUL_CLARO_BG};color:${AZUL};flex:none;">${icone("doc", 18)}</span>
          <div style="font-size:16px;font-weight:800;color:${AZUL_MEDIO};letter-spacing:.3px;">RASTREABILIDADE DAS UTILIZAÇÕES (cont.)</div>
        </div>`

      return `
  <div class="page">
    ${tituloCabecalho}
    <div style="flex:1;min-height:0;padding:6px 18px 10px;display:flex;flex-direction:column;">
      <div style="border:1px solid ${BORDA};border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(15,45,68,.06);">
        <table style="width:100%;border-collapse:collapse;">
          ${cabecalhoTabela}
          <tbody>${corpo}</tbody>
        </table>
      </div>
      <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;">
        ${contador}
        <span style="font-size:9px;color:${TEXTO_SUAVE};">PN: Part Number (Código da Peça) · Período: ${d.periodoInicio} a ${d.periodoFim}</span>
      </div>
    </div>
    <div class="rodape">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:6px;background:${AZUL};color:#fff;">${icone("doc", 13)}</span>
        <span style="font-size:10.5px;color:${TEXTO_SUAVE};">Rastreabilidade completa das saídas do estoque estratégico por ordem de serviço e equipamento.</span>
      </div>
      <div style="display:flex;align-items:center;gap:14px;">
        <span style="font-size:10.5px;font-weight:700;color:${AZUL_MEDIO};">Gestão de Estoque Estratégico</span>
        <img src="${ATLAS_COPCO_LOGO_DATA_URI}" alt="Atlas Copco" style="height:18px;display:block;" />
      </div>
    </div>
  </div>`
    })
    .join("")
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
    background:linear-gradient(180deg, ${AZUL} 0%, #00769a 100%);
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

async function carregarDados(
  itens: ItemEstrategicoRelatorio[],
): Promise<{ p1: DadosPagina1; p2: DadosPagina2; p3: DadosPagina3 }> {
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
    .select("codigo, descricao, quantidade, compressor, ordem_servico, nota_fiscal, utilizacao, data_saida")

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

  /* ---- Dados da Página 2 (a partir das saídas estratégicas) ---- */

  // OS atendidas (ordens de serviço distintas)
  const osSet = new Set<string>()
  // Consumo por código, por tipo de utilização e por equipamento
  const mapaConsumoCod = new Map<string, { descricao: string; total: number }>()
  const mapaConsumoEquip = new Map<string, number>()
  let consumoCorretiva = 0
  let consumoPreventiva = 0
  for (const s of saidasEstrategicas) {
    const qtd = s.quantidade || 0
    const os = (s.ordem_servico || "").trim()
    if (os) osSet.add(os)

    const ex = mapaConsumoCod.get(s.codigo)
    if (ex) {
      ex.total += qtd
      if (!ex.descricao && s.descricao) ex.descricao = s.descricao
    } else {
      mapaConsumoCod.set(s.codigo, { descricao: s.descricao || s.codigo, total: qtd })
    }

    const eq = (s.compressor || "").trim() || "Não informado"
    mapaConsumoEquip.set(eq, (mapaConsumoEquip.get(eq) || 0) + qtd)

    const tipo = (s.utilizacao || "").trim().toLowerCase()
    if (tipo === "corretiva") consumoCorretiva += qtd
    else if (tipo === "preventiva") consumoPreventiva += qtd
  }

  const topConsumidos = [...mapaConsumoCod.values()].sort((a, b) => b.total - a.total).slice(0, 10)
  const consumoEquip = [...mapaConsumoEquip.entries()]
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  // Top 15 itens abaixo do mínimo (maior déficit primeiro)
  const abaixoMinimo = itens
    .filter((i) => (i.diferenca ?? 0) < 0)
    .sort((a, b) => (a.diferenca as number) - (b.diferenca as number))
    .slice(0, 15)
    .map((i) => {
      const deficit = Math.abs(i.diferenca as number)
      return {
        codigo: i.codigo,
        descricao: i.descricao,
        saldo: i.saldo,
        minimo: i.quantidade_minima,
        deficit,
        sugestao: deficit,
      }
    })

  /* ---- Dados da Página 3 (rastreabilidade das saídas estratégicas) ---- */
  const linhasRastreio: LinhaRastreio[] = saidasEstrategicas
    .map((s) => ({
      dataOrd: s.data_saida || "",
      data: s.data_saida ? fmtData(s.data_saida) : "-",
      codigo: s.codigo,
      descricao: s.descricao || "",
      quantidade: s.quantidade || 0,
      equipamento: (s.compressor || "").trim() || "Não informado",
      os: (s.ordem_servico || "").trim() || "-",
      tipo: (s.utilizacao || "").trim(),
      origem: mapaOrigem.get(s.nota_fiscal) || "-",
    }))
    .sort((a, b) => (a.dataOrd < b.dataOrd ? 1 : a.dataOrd > b.dataOrd ? -1 : 0))
    .map(({ dataOrd, ...rest }) => rest)

  const contrato = loadContrato()
  const cliente = "Vale S.A."
  const periodoInicio = fmtData(minData)
  const periodoFim = fmtData(maxData)

  return {
    p1: {
      cliente,
      contrato: contrato.numero,
      planta: contrato.localizacao,
      periodoInicio,
      periodoFim,
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
    },
    p2: {
      cliente,
      contrato: contrato.numero,
      planta: contrato.localizacao,
      periodoInicio,
      periodoFim,
      abaixoMinimo,
      pecasConsumidas,
      osAtendidas: osSet.size,
      taxaUtilizacao,
      topConsumidos,
      consumoCorretiva,
      consumoPreventiva,
      consumoEquip,
    },
    p3: {
      periodoInicio,
      periodoFim,
      linhas: linhasRastreio,
    },
  }
}

/* ------------------------------------------------------------------ */
/* API pública                                                         */
/* ------------------------------------------------------------------ */

export async function gerarRelatorioEstrategico(itens: ItemEstrategicoRelatorio[]): Promise<boolean> {
  const { p1, p2, p3 } = await carregarDados(itens)
  const paginas = paginaResumoExecutivo(p1) + paginaEstoqueUtilizacao(p2) + paginaRastreabilidade(p3)
  const html = montarDocumento("Relatório Gerencial de Estoque Estratégico", paginas)
  return abrirDocumento(html)
}
