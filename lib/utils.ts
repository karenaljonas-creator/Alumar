import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formata uma data "só data" (ex.: "2026-06-15") como "DD/MM/AAAA" SEM conversão de fuso.
// Usar new Date("2026-06-15") interpreta como UTC e, no Brasil (-3h), volta um dia.
export function formatDateOnly(value: string | null | undefined): string {
  if (!value) return "-"
  const datePart = String(value).split("T")[0]
  const m = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) return `${m[3]}/${m[2]}/${m[1]}`
  const d = new Date(value)
  return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("pt-BR")
}

export type CsvCell = string | number | null | undefined

// Escapa um valor para CSV: coloca aspas quando há separador, aspas ou quebra de linha.
function escapeCsvCell(value: string): string {
  if (/[";\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

// Monta o conteúdo CSV usando ";" como separador (padrão do Excel em pt-BR)
// e vírgula como separador decimal nos números.
export function buildCsv(headers: string[], rows: CsvCell[][]): string {
  const formatCell = (cell: CsvCell): string => {
    if (cell === null || cell === undefined) return ""
    if (typeof cell === "number") {
      if (!Number.isFinite(cell)) return ""
      // Vírgula decimal para o Excel pt-BR reconhecer como número
      return escapeCsvCell(cell.toString().replace(".", ","))
    }
    return escapeCsvCell(String(cell))
  }

  const headerLine = headers.map((h) => escapeCsvCell(h)).join(";")
  const dataLines = rows.map((row) => row.map(formatCell).join(";"))
  return [headerLine, ...dataLines].join("\r\n")
}

// Detecta o delimitador de um cabeçalho CSV (";" do Excel pt-BR ou ",").
export function detectCsvDelimiter(headerLine: string): string {
  const semis = headerLine.match(/;/g)?.length || 0
  const commas = headerLine.match(/,/g)?.length || 0
  return semis >= commas ? ";" : ","
}

// Faz o parsing de uma linha CSV respeitando aspas, com delimitador configurável.
export function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === delimiter) {
      result.push(current)
      current = ""
    } else {
      current += char
    }
  }
  result.push(current)
  return result.map((v) => v.trim())
}

// Gera e baixa um arquivo CSV com BOM UTF-8 para os acentos abrirem corretamente no Excel.
export function downloadCsv(filename: string, headers: string[], rows: CsvCell[][]): void {
  const csv = buildCsv(headers, rows)
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
