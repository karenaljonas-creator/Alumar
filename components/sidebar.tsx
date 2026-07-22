"use client"

import { useState, useEffect } from "react"
import {
  LayoutDashboard,
  Calendar,
  History,
  AlertTriangle,
  Cog,
  Settings,
  ChevronLeft,
  ChevronRight,
  Wrench,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getSettings } from "@/lib/supabase/data-service"
import type { Settings as SettingsType } from "@/lib/supabase/database.types"

const navItems = [
  { id: "dashboard", label: "Painel de Controle", icon: LayoutDashboard },
  { id: "registro-semanal", label: "Registro Semanal", icon: Calendar },
  { id: "historico", label: "Historico", icon: History },
  { id: "paradas", label: "Paradas", icon: AlertTriangle },
  { id: "manutencao-preventiva", label: "Manutencao Preventiva", icon: Wrench },
  { id: "gerenciar-maquinas", label: "Gerenciar Maquinas", icon: Cog },
  { id: "configuracoes", label: "Configuracoes", icon: Settings },
]

interface SidebarProps {
  currentPage: string
  onPageChange: (page: string) => void
}

export function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [settings, setSettings] = useState<SettingsType | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const data = await getSettings()
      setSettings(data)
    } catch (error) {
      console.error("Erro ao carregar configuracoes:", error)
    }
  }

  return (
    <aside
      className={cn(
        "flex h-screen flex-col bg-[#0d1b2a] text-white transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 p-4">
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-lg font-bold text-white">
              {settings?.client_name || "ALUMAR"}
            </span>
            <span className="text-[10px] text-white/40 uppercase tracking-wider">
              Gestao de Maquinas
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded hover:bg-white/5 text-white/40 hover:text-white transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id

          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-[#0099cc] text-white"
                  : "text-white/50 hover:bg-white/5 hover:text-white/80"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="border-t border-white/5 p-4">
          <div className="text-[10px] text-white/30 space-y-1">
            <p>Contrato: {settings?.contract_number || "CT-2024-001"}</p>
            <p>{settings?.location || "Sao Luis - MA"}</p>
          </div>
        </div>
      )}
    </aside>
  )
}
