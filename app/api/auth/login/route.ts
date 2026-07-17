import { NextResponse } from "next/server"
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE, type Role } from "@/lib/auth"

export async function POST(request: Request) {
  let password = ""
  try {
    const body = await request.json()
    password = typeof body?.password === "string" ? body.password : ""
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 })
  }

  const secret = process.env.AUTH_SECRET
  const editorPassword = process.env.APP_EDITOR_PASSWORD
  const viewerPassword = process.env.APP_VIEWER_PASSWORD

  if (!secret || !editorPassword || !viewerPassword) {
    return NextResponse.json(
      { error: "Autenticação não configurada. Contate o administrador." },
      { status: 500 },
    )
  }

  let role: Role | null = null
  if (password && password === editorPassword) role = "editor"
  else if (password && password === viewerPassword) role = "viewer"

  if (!role) {
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 })
  }

  const token = await createSessionToken(role, secret)
  const response = NextResponse.json({ ok: true, role })
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  })
  return response
}
