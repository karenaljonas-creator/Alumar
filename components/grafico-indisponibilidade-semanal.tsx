"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { loadHistory } from "@/lib/supabase-history-storage"
import { dedupeHistoryPorSemana } from "@/lib/machine-utils"
import { useMemo, useEffect, useState } from "react"

interface GraficoIndisponibilidadeSemanalProps {
  contratoFilter: string
}

export function GraficoIndisponibilidadeSemanal({ contratoFilter }: GraficoIndisponibilidadeSemanalProps) {
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

    const last7Weeks = dedupeHistoryPorSemana(history).slice(-7)

    return last7Weeks.map((snapshot) => {
      let paradas: number

      if (contratoFilter === "todos") {
        paradas = snapshot.stats.paradas
      } else {
        const machines = snapshot.machines || []
        const filteredMachines = machines.filter((m) => {
          if (contratoFilter === "com-contrato") return m.temContrato === true
          if (contratoFilter === "sem-contrato") return m.temContrato === false
          return true
        })

        paradas = filteredMachines.filter((m) => m.status === "parada").length
      }

      return {
        semana: `Semana ${snapshot.semana?.split("-W")[1] || "?"}`,
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
            <BarChart data={chartData} margin={{ left: 10, right: 30, top: 10, bottom: 10 }} barGap={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="semana" tick={{ fontSize: 13, fill: "#0f172a" }} />
              <YAxis tick={{ fontSize: 13, fill: "#0f172a" }} />
              <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "rgba(0, 0, 0, 0.05)" }} />
              <Bar dataKey="paradas" fill="#94a3b8" radius={[6, 6, 0, 0]} maxBarSize={80} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
