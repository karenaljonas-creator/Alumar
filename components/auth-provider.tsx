"use client"

import { createContext, useContext, useEffect } from "react"
import type { Role } from "@/lib/auth"
import { setClientRole } from "@/lib/supabase/client"

type AuthContextValue = {
  role: Role | null
  canEdit: boolean
}

const AuthContext = createContext<AuthContextValue>({ role: null, canEdit: false })

export function AuthProvider({
  role,
  children,
}: {
  role: Role | null
  children: React.ReactNode
}) {
  // Propaga o papel para o cliente Supabase, que bloqueia escritas de "viewer".
  useEffect(() => {
    setClientRole(role)
  }, [role])

  return <AuthContext.Provider value={{ role, canEdit: role === "editor" }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
