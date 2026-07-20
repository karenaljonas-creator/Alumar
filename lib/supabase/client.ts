import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

let supabaseClient: SupabaseClient | null = null

// Papel do usuário logado no lado do cliente. Definido pelo AuthProvider.
// Quando for "viewer", todas as operações de escrita são bloqueadas.
let clientRole: "editor" | "viewer" | null = null

export function setClientRole(role: "editor" | "viewer" | null) {
  clientRole = role
}

const READ_ONLY_ERROR = {
  message: "Acesso somente leitura: você não tem permissão para editar os dados.",
  details: "",
  hint: "",
  code: "READ_ONLY",
}

// Cria um "builder" falso que rejeita a operação, mas continua encadeável
// (suporta .select(), .eq(), .single(), await, etc.) resolvendo com erro.
function makeRejectingBuilder(): any {
  const result = { data: null, error: READ_ONLY_ERROR }
  const promise = Promise.resolve(result)
  const proxy: any = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") return promise.then.bind(promise)
        if (prop === "catch") return promise.catch.bind(promise)
        if (prop === "finally") return promise.finally.bind(promise)
        // Qualquer método encadeado (.select, .eq, .single, ...) devolve o mesmo proxy
        return () => proxy
      },
    },
  )
  return proxy
}

// Bloqueia operações de escrita para visualizadores.
function applyReadOnlyGuard(client: SupabaseClient): SupabaseClient {
  const originalFrom = client.from.bind(client)
  ;(client as any).from = (table: string) => {
    const builder: any = originalFrom(table)
    if (clientRole === "viewer") {
      for (const method of ["insert", "update", "delete", "upsert"]) {
        builder[method] = () => makeRejectingBuilder()
      }
    }
    return builder
  }

  const originalRpc = client.rpc.bind(client)
  ;(client as any).rpc = (...args: any[]) => {
    if (clientRole === "viewer") return makeRejectingBuilder()
    return (originalRpc as any)(...args)
  }

  return client
}

export function createClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    // Durante o build ou quando as variáveis não estão disponíveis,
    // loga um aviso mas não lança erro imediatamente
    if (typeof window !== "undefined") {
      console.warn(
        "[Supabase] Variáveis de ambiente não configuradas. Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY",
      )
    }
    // Retorna um client vazio que vai falhar graciosamente nas operações
    throw new Error("Variáveis de ambiente do Supabase não configuradas")
  }

  if (supabaseClient) {
    return supabaseClient
  }

  const client = createBrowserClient(supabaseUrl, supabaseKey)
  supabaseClient = applyReadOnlyGuard(client)

  return supabaseClient
}
