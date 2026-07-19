"use client"

import { createContext, useContext } from "react"
import type { Role } from "@/lib/auth"

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
  return <AuthContext.Provider value={{ role, canEdit: role === "editor" }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
