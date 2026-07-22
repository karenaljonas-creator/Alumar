// Autenticação simples por senha compartilhada, com 2 papéis:
// - "editor": acesso total (pode editar, importar, excluir)
// - "viewer": somente visualização
//
// A sessão é um token assinado com HMAC-SHA256 usando AUTH_SECRET.
// Funciona tanto no middleware (edge) quanto em route handlers (node),
// pois usa a Web Crypto API (globalThis.crypto.subtle).

export type Role = "editor" | "viewer"

export const SESSION_COOKIE = "gc_session"
// Duração da sessão: 12 horas
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12

function base64UrlEncode(bytes: Uint8Array): string {
  let str = ""
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i])
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function base64UrlToBytes(input: string): Uint8Array {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/")
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4))
  const str = atob(b64 + pad)
  const bytes = new Uint8Array(str.length)
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i)
  return bytes
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  )
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await importKey(secret)
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))
  return base64UrlEncode(new Uint8Array(sig))
}

// Gera um token de sessão: base64(payload).assinatura
export async function createSessionToken(role: Role, secret: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS
  const payloadObj = { role, exp }
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payloadObj)))
  const signature = await sign(payload, secret)
  return `${payload}.${signature}`
}

// Verifica o token e retorna o papel, ou null se inválido/expirado.
export async function verifySessionToken(
  token: string | undefined | null,
  secret: string,
): Promise<Role | null> {
  if (!token || !secret) return null
  const parts = token.split(".")
  if (parts.length !== 2) return null
  const [payload, signature] = parts

  const expected = await sign(payload, secret)
  // Comparação de tamanho constante
  if (!timingSafeEqual(signature, expected)) return null

  try {
    const json = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload)))
    if (json.role !== "editor" && json.role !== "viewer") return null
    if (typeof json.exp !== "number" || json.exp < Math.floor(Date.now() / 1000)) return null
    return json.role as Role
  } catch {
    return null
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return result === 0
}

export const SESSION_MAX_AGE = SESSION_MAX_AGE_SECONDS

// Opções do cookie de sessão.
// sameSite "none" + secure é obrigatório para o cookie funcionar dentro de
// iframes cross-site (ex.: o preview do v0). Continua válido no site publicado
// e no domínio próprio, pois ambos são servidos via HTTPS.
export const sessionCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none" as const,
  path: "/",
}
