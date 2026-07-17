import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth"

// Protege TODO o sistema: sem sessão válida, redireciona para /login.
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas públicas (login e endpoints de autenticação)
  const isPublic =
    pathname === "/login" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/images/")

  const token = request.cookies.get(SESSION_COOKIE)?.value
  const secret = process.env.AUTH_SECRET || ""
  const role = await verifySessionToken(token, secret)

  // Já logado tentando acessar /login -> manda para a home
  if (role && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url))
  }

  if (isPublic) return NextResponse.next()

  // Não logado -> vai para /login
  if (!role) {
    const loginUrl = new URL("/login", request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  // Aplica a todas as rotas, exceto assets estáticos do Next e arquivos com extensão
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
