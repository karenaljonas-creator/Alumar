"use client"

import type React from "react"
import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock, Loader2, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password || loading) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error || "Não foi possível entrar.")
        setLoading(false)
        return
      }
      // Sucesso: recarrega para a home (o layout lê o novo cookie no servidor)
      router.replace("/")
      router.refresh()
    } catch {
      setError("Erro de conexão. Tente novamente.")
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {/* Cabeçalho com a marca */}
          <div className="flex flex-col items-center gap-3 bg-[#0092bc] px-6 py-8">
            <div className="w-40">
              <Image
                src="/images/atlas-copco-oficial.png"
                alt="Atlas Copco"
                width={4167}
                height={2775}
                className="h-auto w-full object-contain"
                priority
              />
            </div>
            <p className="text-center text-sm font-medium text-white/90">Gestão de Contrato</p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
            <div className="space-y-1 text-center">
              <h1 className="text-lg font-bold text-slate-800">Acesso ao Sistema</h1>
              <p className="text-sm text-slate-500">Digite a senha de acesso para continuar.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700">
                Senha
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                  autoComplete="current-password"
                  className="pl-9 pr-9"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-600" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading || !password} className="w-full bg-[#0092bc] hover:bg-[#007ba0]">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">Mina de Salobo - PA</p>
      </div>
    </main>
  )
}
