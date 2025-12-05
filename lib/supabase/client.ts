import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

let supabaseClient: SupabaseClient | null = null

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log("[v0] Supabase URL disponível:", !!supabaseUrl)
  console.log("[v0] Supabase Key disponível:", !!supabaseKey)

  if (!supabaseUrl || !supabaseKey) {
    console.error("[v0] ERRO: Variáveis de ambiente do Supabase não encontradas!")
    console.error("[v0] NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl)
    console.error("[v0] NEXT_PUBLIC_SUPABASE_ANON_KEY:", supabaseKey ? "[PRESENTE]" : "[AUSENTE]")
    throw new Error("Variáveis de ambiente do Supabase não configuradas")
  }

  if (supabaseClient) {
    return supabaseClient
  }

  console.log("[v0] Criando cliente Supabase...")

  supabaseClient = createBrowserClient(supabaseUrl, supabaseKey)

  console.log("[v0] Cliente Supabase criado com sucesso")

  return supabaseClient
}
