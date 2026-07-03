/**
 * Paleta oficial Atlas Copco para as categorias do sistema.
 *
 * Regras de uso (padrão visual Atlas Copco):
 *  - Azuis  -> atividades com ação ou execução.
 *  - Cinzas -> espera, planejamento ou apoio.
 *  - Vermelho é reservado APENAS para alertas críticos (prazo vencido / máquina crítica).
 *
 * Base de cores: Blue 03-11 | Gray 03-09
 */

// Tons de azul (claro -> escuro)
export const BLUE_03 = "#a8d4ec"
export const BLUE_05 = "#6cb2dd"
export const BLUE_07 = "#3a8cc4"
export const BLUE_09 = "#1a5c96"
export const BLUE_11 = "#0c3b63"

// Tons de cinza (claro -> escuro)
export const GRAY_03 = "#d7dbde"
export const GRAY_05 = "#9aa2a9"
export const GRAY_07 = "#78828b"
export const GRAY_09 = "#4d5964"

// Mapa fixo categoria -> cor (conforme padrão visual Atlas Copco)
export const CATEGORIA_CORES: Record<string, string> = {
  "Aguardando Peça": BLUE_09,
  "Aguardando Cliente": BLUE_05,
  "Aguardando Programação / Recurso": GRAY_07,
  "Instalação / Start-up": BLUE_11,
  "Manutenção Corretiva": BLUE_07,
  "Melhoria / Engenharia": GRAY_09,
  "Logística / Transporte": GRAY_05,
  "Em execução": BLUE_03,
  Programado: GRAY_03,
}

// Cor de fallback para categorias não mapeadas / sem categoria.
const FALLBACK = GRAY_05

// Paleta de reserva para eventuais categorias fora do mapa fixo,
// mantendo tudo dentro da identidade azul/cinza Atlas.
const PALETA_RESERVA = [BLUE_09, GRAY_07, BLUE_07, GRAY_09, BLUE_05, GRAY_05, BLUE_11, BLUE_03, GRAY_03]

/**
 * Retorna a cor oficial da categoria. Para categorias conhecidas usa o mapa
 * fixo; para desconhecidas usa uma cor estável da paleta de reserva (nunca
 * fora dos tons azul/cinza Atlas Copco).
 */
export function corDaCategoria(nome?: string | null): string {
  if (!nome) return FALLBACK
  const direta = CATEGORIA_CORES[nome]
  if (direta) return direta
  // Hash estável para categorias fora do mapa (determinístico por nome).
  let hash = 0
  for (let i = 0; i < nome.length; i++) hash = (hash * 31 + nome.charCodeAt(i)) >>> 0
  return PALETA_RESERVA[hash % PALETA_RESERVA.length]
}

/**
 * Constrói um mapa nome->cor para uma lista de categorias, usando sempre a
 * cor oficial de cada categoria (a mesma categoria terá sempre a mesma cor).
 */
export function buildCategoriaColorMap(nomes: string[]): Map<string, string> {
  const map = new Map<string, string>()
  nomes.forEach((nome) => {
    if (!map.has(nome)) map.set(nome, corDaCategoria(nome))
  })
  return map
}
