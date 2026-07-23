import { Pool } from "pg"

// Pool de conexão único e compartilhado com o Neon.
// A ausência da variável não derruba a importação do módulo — o erro só
// aconteceria (de forma controlada) na primeira query, caso não configurado.
let _pool: Pool | null = null

export function getPool(): Pool {
  if (!_pool) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error("Variável de ambiente DATABASE_URL não configurada (Neon)")
    }
    _pool = new Pool({ connectionString })
  }
  return _pool
}

// Helper para executar queries parametrizadas com segurança (evita SQL injection).
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const pool = getPool()
  const result = await pool.query(text, params)
  return result.rows as T[]
}
