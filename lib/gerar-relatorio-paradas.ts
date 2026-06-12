import type { Machine } from "@/lib/types"
import { ATLAS_COPCO_LOGO_DATA_URI } from "@/lib/atlas-copco-logo"

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function formatDate(dateStr?: string): string {
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

interface RelatorioOptions {
  localizacao?: string
  contrato?: string
}

export function gerarRelatorioParadas(machines: Machine[], options: RelatorioOptions = {}) {
  const dataGeracao = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  const totalParadas = machines.length
  const paradasVale = machines.filter((m) => m.acaoResponsavel === "Vale").length
  const paradasAtlas = machines.filter((m) => m.acaoResponsavel === "Atlas").length

  const logoUrl = ATLAS_COPCO_LOGO_DATA_URI

  const rows = machines
    .map((m, index) => {
      const dias = m.tempoParada ?? getDiasParada(m.dataParada)
      const zebra = index % 2 === 0 ? "#ffffff" : "#f3f6f9"
      return `
        <tr style="background:${zebra};">
          <td style="padding:9px 10px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#0f2d44;">${escapeHtml(m.nome || "-")}</td>
          <td style="padding:9px 10px;border-bottom:1px solid #e2e8f0;">${escapeHtml(m.tipo || "-")}</td>
          <td style="padding:9px 10px;border-bottom:1px solid #e2e8f0;">${escapeHtml(m.localizacao || "-")}</td>
          <td style="padding:9px 10px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:600;">${dias} dias</td>
          <td style="padding:9px 10px;border-bottom:1px solid #e2e8f0;max-width:320px;">${escapeHtml(m.motivoParada || "-")}</td>
          <td style="padding:9px 10px;border-bottom:1px solid #e2e8f0;text-align:center;">${formatDate(m.prazoDados)}</td>
          <td style="padding:9px 10px;border-bottom:1px solid #e2e8f0;text-align:center;">${escapeHtml(m.acaoResponsavel || "-")}</td>
          <td style="padding:9px 10px;border-bottom:1px solid #e2e8f0;">${escapeHtml(m.responsavel || "-")}</td>
        </tr>`
    })
    .join("")

  const filtrosTexto: string[] = []
  if (options.localizacao && options.localizacao !== "todas") {
    filtrosTexto.push(`Localização: ${options.localizacao}`)
  }
  if (options.contrato && options.contrato !== "todos") {
    filtrosTexto.push(`Contrato: ${options.contrato === "sim" ? "Com contrato" : "Sem contrato"}`)
  }
  const filtroLinha =
    filtrosTexto.length > 0
      ? `<p style="margin:6px 0 0;color:#5b7083;font-size:13px;">Filtros aplicados: ${escapeHtml(filtrosTexto.join("  |  "))}</p>`
      : ""

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Relatório de Máquinas Paradas - Salobo</title>
<style>
  @page { size: A4 landscape; margin: 14mm; }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #1f2d3a;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .header {
    background: #0c2c44;
    color: #ffffff;
    padding: 22px 28px;
    display: flex;
    align-items: center;
    gap: 22px;
  }
  .header .logo {
    display: flex;
    align-items: center;
  }
  .header .logo img { height: 48px; display: block; }
  .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.4px; }
  .header p { margin: 4px 0 0; font-size: 13px; color: #b9c9d6; }
  .section { padding: 24px 28px 0; }
  .section h2 {
    color: #15607a;
    font-size: 20px;
    margin: 0 0 10px;
    font-weight: 800;
  }
  .section .lead { color: #45586a; font-size: 14px; line-height: 1.5; margin: 0 0 18px; }
  .cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-bottom: 8px;
  }
  .card {
    background: #0c2c44;
    border-radius: 4px;
    padding: 14px 16px;
  }
  .card .label { color: #9fb4c4; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }
  .card .value { font-size: 26px; font-weight: 800; margin-top: 6px; }
  .v-white { color: #ffffff; }
  .v-green { color: #4ade80; }
  .v-amber { color: #fbbf24; }
  .v-red { color: #f87171; }
  .v-blue { color: #38bdf8; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-top: 4px; table-layout: fixed; }
  td, th { word-break: normal; overflow-wrap: break-word; hyphens: none; vertical-align: top; }
  thead th {
    background: #0c2c44;
    color: #ffffff;
    text-align: left;
    padding: 10px;
    font-size: 12.5px;
    font-weight: 700;
  }
  thead th.center { text-align: center; }
  .col-tag { width: 9%; }
  .col-modelo { width: 9%; }
  .col-local { width: 16%; }
  .col-tempo { width: 8%; }
  .col-obs { width: 27%; }
  .col-prazo { width: 9%; }
  .col-acao { width: 6%; }
  .col-resp { width: 16%; }
  .footer {
    padding: 18px 28px;
    color: #8094a4;
    font-size: 11px;
    border-top: 1px solid #e2e8f0;
    margin-top: 26px;
    display: flex;
    justify-content: space-between;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="logo"><img src="${logoUrl}" alt="Atlas Copco" /></div>
    <div>
      <h1>RELATÓRIO DE MÁQUINAS PARADAS</h1>
      <p>Salobo | Gerado em ${escapeHtml(dataGeracao)}</p>
    </div>
  </div>

  <div class="section">
    <h2>Resumo executivo</h2>
    <p class="lead">
      Este relatório consolida o panorama atual das máquinas paradas, com os principais indicadores de
      indisponibilidade, responsabilidade por ação e tempo de parada acumulado, com base nos registros
      atualmente carregados no dashboard.
    </p>
    ${filtroLinha}
    <div class="cards">
      <div class="card"><div class="label">Máquinas paradas</div><div class="value v-red">${totalParadas}</div></div>
      <div class="card"><div class="label">Ação Vale</div><div class="value v-blue">${paradasVale}</div></div>
      <div class="card"><div class="label">Ação Atlas</div><div class="value v-amber">${paradasAtlas}</div></div>
    </div>
  </div>

  <div class="section">
    <h2>Detalhamento das máquinas paradas</h2>
    <table>
      <colgroup>
        <col class="col-tag" />
        <col class="col-modelo" />
        <col class="col-local" />
        <col class="col-tempo" />
        <col class="col-obs" />
        <col class="col-prazo" />
        <col class="col-acao" />
        <col class="col-resp" />
      </colgroup>
      <thead>
        <tr>
          <th>TAG</th>
          <th>Modelo</th>
          <th>Localização</th>
          <th class="center">Tempo</th>
          <th>Observações</th>
          <th class="center">Prazo</th>
          <th class="center">Ação</th>
          <th>Responsável</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="8" style="padding:20px;text-align:center;color:#8094a4;">Nenhuma máquina parada encontrada.</td></tr>`}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <span>Gestão de Máquinas - Mina de Salobo - PA</span>
    <span>Relatório gerado automaticamente em ${escapeHtml(dataGeracao)}</span>
  </div>

  <script>
    window.onload = function () {
      setTimeout(function () { window.print(); }, 350);
    };
  </script>
</body>
</html>`

  const printWindow = window.open("", "_blank", "width=1200,height=800")
  if (!printWindow) {
    return false
  }
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  return true
}
