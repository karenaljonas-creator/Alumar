"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Dashboard } from "@/components/pages/dashboard"
import { RegistroSemanal } from "@/components/pages/registro-semanal"
import { Historico } from "@/components/pages/historico"
import { Paradas } from "@/components/pages/paradas"
import { ManutencaoPreventiva } from "@/components/pages/manutencao-preventiva"
import { GerenciarMaquinas } from "@/components/pages/gerenciar-maquinas"
import { Configuracoes } from "@/components/pages/configuracoes"

export function AppLayout() {
  const [currentPage, setCurrentPage] = useState("dashboard")

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />
      case "registro-semanal":
        return <RegistroSemanal />
      case "historico":
        return <Historico />
      case "paradas":
        return <Paradas />
      case "manutencao-preventiva":
        return <ManutencaoPreventiva />
      case "gerenciar-maquinas":
        return <GerenciarMaquinas />
      case "configuracoes":
        return <Configuracoes />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className="flex-1 overflow-auto">{renderPage()}</main>
    </div>
  )
}
