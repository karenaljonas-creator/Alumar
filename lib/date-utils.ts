/**
 * Utilitários para manipulação de datas sem conversão de timezone
 * Evita problema onde data 28/05 é salva como 27/05 (deslocamento de um dia)
 */

/**
 * Converte string de data para formato dd/mm/aaaa sem conversão de timezone
 * @param dateStr - Data em formato ISO (YYYY-MM-DD) ou Date
 * @returns Formato dd/mm/aaaa ou string vazia se inválido
 */
export function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return ""

  try {
    // Se for uma string ISO (YYYY-MM-DD), fazer parse sem timezone
    if (typeof dateStr === "string" && dateStr.includes("-") && !dateStr.includes("T")) {
      const [year, month, day] = dateStr.split("-")
      if (year && month && day) {
        return `${day}/${month}/${year}`
      }
    }

    // Tentar fazer parse da data
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return "" // Invalid Date
    }

    // Usar métodos do Date que não envolvem timezone
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear()

    return `${day}/${month}/${year}`
  } catch {
    return ""
  }
}

/**
 * Converte data em formato dd/mm/aaaa para ISO (YYYY-MM-DD) sem conversão de timezone
 * @param dateStr - Data em formato dd/mm/aaaa
 * @returns Data em formato YYYY-MM-DD ou string vazia se inválido
 */
export function parseDateBR(dateStr?: string | null): string {
  if (!dateStr) return ""

  try {
    // Se já estiver em formato ISO, retornar
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr
    }

    // Parse dd/mm/aaaa ou d/m/aaaa
    const parts = dateStr.split("/")
    if (parts.length !== 3) return ""

    const day = parts[0].padStart(2, "0")
    const month = parts[1].padStart(2, "0")
    const year = parts[2]

    // Validação básica
    if (!/^\d{2}$/.test(day) || !/^\d{2}$/.test(month) || !/^\d{4}$/.test(year)) {
      return ""
    }

    return `${year}-${month}-${day}`
  } catch {
    return ""
  }
}

/**
 * Obtém data de input type="date" (YYYY-MM-DD) e retorna no formato ISO correto
 * @param inputValue - Valor do input date
 * @returns Data no formato YYYY-MM-DD
 */
export function getDateFromInput(inputValue: string): string {
  if (!inputValue) return ""
  
  try {
    // Input type="date" já retorna YYYY-MM-DD
    const parts = inputValue.split("-")
    if (parts.length === 3 && /^\d{4}$/.test(parts[0])) {
      return inputValue // Já está no formato correto
    }
  } catch {
    return ""
  }

  return ""
}

/**
 * Calcula dias de parada baseado em dataParada
 * @param dataParada - Data de início da parada
 * @returns Número de dias ou -1 se inválido
 */
export function calculateDiasParada(dataParada?: string): number {
  if (!dataParada) return -1

  try {
    // Parse data ISO YYYY-MM-DD
    const [year, month, day] = dataParada.split("-")
    if (!year || !month || !day) return -1

    const parada = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    const hoje = new Date()

    // Zerar horas para comparação consistente
    hoje.setHours(0, 0, 0, 0)
    parada.setHours(0, 0, 0, 0)

    const diffTime = hoje.getTime() - parada.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    return diffDays >= 0 ? diffDays : -1
  } catch {
    return -1
  }
}

/**
 * Valida se uma string é uma data válida
 * @param dateStr - Data em formato YYYY-MM-DD ou dd/mm/aaaa
 * @returns true se válida, false se não
 */
export function isValidDate(dateStr?: string | null): boolean {
  if (!dateStr) return false

  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      // Formato ISO
      const [year, month, day] = dateStr.split("-").map(Number)
      if (month < 1 || month > 12 || day < 1 || day > 31) return false
      return true
    }

    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
      // Formato dd/mm/aaaa
      const parts = dateStr.split("/").map(Number)
      const day = parts[0]
      const month = parts[1]
      if (month < 1 || month > 12 || day < 1 || day > 31) return false
      return true
    }

    return false
  } catch {
    return false
  }
}
