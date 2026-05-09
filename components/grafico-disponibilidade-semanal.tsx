"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { loadHistory } from "@/lib/supabase-history-storage"
import { useMemo, useEffect, useState } from "react"

interface GraficoDisponibilidadeSemanalProps {
  contratoFilter: string
}

export function GraficoDisponibilidadeSemanal({ contratoFilter }: GraficoDisponibilidadeSemanalProps) {
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
      return { data: [] }
    }

    const last5Weeks = history
      .sort((a, b) => new Date(a.dataRegistro).getTime() - new Date(b.dataRegistro).getTime())
      .slice(-5)

    const data = last5Weeks.map((snapshot) => {
      let disponibilidade: number

      if (contratoFilter === "todos") {
        disponibilidade = snapshot.stats.disponibilidade
      } else {
        const machines = snapshot.machines || []
        const filteredMachines = machines.filter((m: { temContrato?: boolean }) => {
          if (contratoFilter === "com-contrato") return m.temContrato === true
          if (contratoFilter === "sem-contrato") return m.temContrato === false
          return true
        })

        const operacionais = filteredMachines.filter((m: { status?: string }) => m.status === "operacional").length
        const total = filteredMachines.length
        disponibilidade = total > 0 ? (operacionais / total) * 100 : 0
      }

      return {
        semana: `Semana ${snapshot.semana?.split("-W")[1] || "?"}`,
        disponibilidade: Number(disponibilidade.toFixed(1)),
      }
    })

    return { data }
  }, [history, contratoFilter])

  if (loading) {
    return (
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2 pt-5 px-5 text-center">
          <CardTitle className="text-xl font-semibold text-foreground">Disponibilidade Semanal</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Evolução da disponibilidade ao longo das semanas (Meta: 90%)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 flex items-center justify-center h-[280px]">
          <div className="text-sm text-muted-foreground">Carregando dados...</div>
        </CardContent>
      </Card>
    )
  }

  if (chartData.data.length === 0) {
    return (
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2 pt-5 px-5 text-center">
          <CardTitle className="text-xl font-semibold text-foreground">Disponibilidade Semanal</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Evolução da disponibilidade ao longo das semanas (Meta: 90%)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 flex items-center justify-center h-[280px]">
          <div className="text-sm text-muted-foreground">Nenhum dado histórico disponível</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3 pt-5 px-5 text-center">
        <CardTitle className="text-xl font-semibold text-foreground">Disponibilidade Semanal</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Evolução da disponibilidade ao longo das semanas (Meta: 90%)
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5">
        <div className="w-full max-w-full overflow-hidden">
          <ChartContainer
            config={{
              disponibilidade: {
                label: "Disponibilidade (%)",
                color: "#1e5a8e",
              },
            }}
            className="h-[280px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.data} margin={{ left: 40, right: 40, top: 20, bottom: 60 }} barGap={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="semana" tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }} tickMargin={10} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }} tickMargin={10} />
                <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "rgba(0, 0, 0, 0.05)" }} />
                <Bar dataKey="disponibilidade" fill="#1e5a8e" radius={[4, 4, 0, 0]} maxBarSize={60}>
                  <LabelList
                    dataKey="disponibilidade"
                    position="top"
                    formatter={(value: number) => `${value}%`}
                    style={{ fontSize: 12, fontWeight: 600, fill: "hsl(var(--foreground))" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}
