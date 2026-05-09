"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { loadHistory } from "@/lib/supabase-history-storage"
import { useMemo, useEffect, useState } from "react"

interface GraficoIndisponibilidadeSemanalProps {
  contratoFilter: string
  currentParadas?: number // Número atual de máquinas paradas para sobrescrever semana atual
}

export function GraficoIndisponibilidadeSemanal({ contratoFilter, currentParadas }: GraficoIndisponibilidadeSemanalProps) {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true)
      const data = await loadHistory()
      setHistory(data)
      setLoading(false)
    }
    fetchHistory()
  }, [])

  const chartData = useMemo(() => {
    if (!history || history.length === 0) {
      return []
    }

    // Ordenar pelo ano e semana (formato: "2026-W19")
    const sortedHistory = [...history].sort((a, b) => {
      const [yearA, weekPartA] = a.semana?.split("-W") || ["0", "0"]
      const [yearB, weekPartB] = b.semana?.split("-W") || ["0", "0"]
      const yearCompare = Number.parseInt(yearA) - Number.parseInt(yearB)
      if (yearCompare !== 0) return yearCompare
      return Number.parseInt(weekPartA) - Number.parseInt(weekPartB)
    })
    
    // Remover semanas duplicadas, mantendo apenas o registro mais recente de cada semana
    const uniqueWeeks = new Map<string, typeof sortedHistory[0]>()
    for (const snapshot of sortedHistory) {
      if (snapshot.semana) {
        uniqueWeeks.set(snapshot.semana, snapshot) // Sobrescreve com o mais recente
      }
    }
    
    // Converter para array, ordenar e pegar as últimas 7 semanas
    const uniqueHistory = Array.from(uniqueWeeks.values()).sort((a, b) => {
      const [yearA, weekPartA] = a.semana?.split("-W") || ["0", "0"]
      const [yearB, weekPartB] = b.semana?.split("-W") || ["0", "0"]
      const yearCompare = Number.parseInt(yearA) - Number.parseInt(yearB)
      if (yearCompare !== 0) return yearCompare
      return Number.parseInt(weekPartA) - Number.parseInt(weekPartB)
    })
    
    const last7Weeks = uniqueHistory.slice(-7)

    // Calcular a semana atual
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
    const currentWeekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7)
    const currentWeekKey = `${now.getFullYear()}-W${currentWeekNumber.toString().padStart(2, '0')}`

    return last7Weeks.map((snapshot) => {
      let paradas: number

      // Se for a semana atual e temos dados atuais, usar os dados atuais
      const isCurrentWeek = snapshot.semana === currentWeekKey
      
      if (isCurrentWeek && currentParadas !== undefined) {
        paradas = currentParadas
      } else if (contratoFilter === "todos") {
        paradas = snapshot.stats.paradas
      } else {
        const machines = snapshot.machines || []
        const filteredMachines = machines.filter((m: { temContrato?: boolean }) => {
          if (contratoFilter === "com-contrato") return m.temContrato === true
          if (contratoFilter === "sem-contrato") return m.temContrato === false
          return true
        })

        paradas = filteredMachines.filter((m: { status?: string }) => m.status === "parada").length
      }

      const weekPart = snapshot.semana?.split("-W")[1] || "?"
      
      return {
        semana: `Semana ${weekPart}`,
        paradas,
      }
    })
  }, [history, contratoFilter])

  if (loading) {
    return (
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2 pt-6 px-6">
          <CardTitle className="text-lg font-semibold">Máquinas Paradas por Semana</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Evolução do número de máquinas paradas ao longo das semanas
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6 flex items-center justify-center h-[280px]">
          <div className="text-sm text-muted-foreground">Carregando dados...</div>
        </CardContent>
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2 pt-6 px-6">
          <CardTitle className="text-lg font-semibold">Máquinas Paradas por Semana</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Evolução do número de máquinas paradas ao longo das semanas
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6 flex items-center justify-center h-[280px]">
          <div className="text-sm text-muted-foreground">Nenhum dado histórico disponível</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3 pt-6 px-6">
        <CardTitle className="text-lg font-semibold">Máquinas Paradas por Semana</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Evolução do número de máquinas paradas ao longo das semanas
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <ChartContainer
          config={{
            paradas: {
              label: "Máquinas Paradas",
              color: "#94a3b8",
            },
          }}
          className="h-[280px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: 10, right: 30, top: 25, bottom: 10 }} barGap={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="semana" tick={{ fontSize: 13, fill: "#0f172a" }} />
              <YAxis tick={{ fontSize: 13, fill: "#0f172a" }} />
              <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "rgba(0, 0, 0, 0.05)" }} />
              <Bar dataKey="paradas" fill="#94a3b8" radius={[6, 6, 0, 0]} maxBarSize={80}>
                <LabelList dataKey="paradas" position="top" fill="#0f172a" fontSize={12} fontWeight={600} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
