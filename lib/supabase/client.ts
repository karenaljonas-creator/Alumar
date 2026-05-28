import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

let supabaseClient: SupabaseClient | null = null

export function createClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    // Durante o build ou quando as variáveis não estão disponíveis,
    // loga um aviso mas não lança erro imediatamente
    if (typeof window !== 'undefined') {
      console.warn("[Supabase] Variáveis de ambiente não configuradas. Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY")
    }
    // Retorna um client vazio que vai falhar graciosamente nas operações
    throw new Error("Variáveis de ambiente do Supabase não configuradas")
  }

  if (supabaseClient) {
    return supabaseClient
  }

  supabaseClient = createBrowserClient(supabaseUrl, supabaseKey)

  return supabaseClient
}
