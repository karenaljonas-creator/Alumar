"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LabelList,
  ReferenceLine,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { loadHistory } from "@/lib/supabase-history-storage"
import { dedupeHistoryPorSemana } from "@/lib/machine-utils"
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

    const lastWeeks = dedupeHistoryPorSemana(history).slice(-9)

    const data = lastWeeks.map((snapshot) => {
      let disponibilidade: number

      if (contratoFilter === "todos") {
        // Disponibilidade contratual (Atlas): considera indisponíveis apenas paradas Atlas
        disponibilidade = snapshot.stats.disponibilidadeContrato ?? snapshot.stats.disponibilidade
      } else {
        const machines = snapshot.machines || []
        const filteredMachines = machines.filter((m) => {
          if (contratoFilter === "com-contrato") return m.temContrato === true
          if (contratoFilter === "sem-contrato") return m.temContrato === false
          return true
        })

        const total = filteredMachines.length
        const indisponiveisAtlas = filteredMachines.filter(
          (m) => m.status === "parada" && m.acaoResponsavel === "Atlas",
        ).length
        disponibilidade = total > 0 ? ((total - indisponiveisAtlas) / total) * 100 : 0
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
        <CardHeader className="pb-2 pt-5 px-5">
          <CardTitle className="text-sm font-bold uppercase tracking-wide text-foreground">
          Disponibilidade Semanal
        </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Evolução da disponibilidade ao longo das semanas (Meta: 90%)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 flex items-center justify-center h-[150px]">
          <div className="text-sm text-muted-foreground">Carregando dados...</div>
        </CardContent>
      </Card>
    )
  }

  if (chartData.data.length === 0) {
    return (
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2 pt-5 px-5">
          <CardTitle className="text-sm font-bold uppercase tracking-wide text-foreground">
          Disponibilidade Semanal
        </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Evolução da disponibilidade ao longo das semanas (Meta: 90%)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 flex items-center justify-center h-[150px]">
          <div className="text-sm text-muted-foreground">Nenhum dado histórico disponível</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-bold uppercase tracking-wide text-foreground">
          Disponibilidade Semanal
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Evolução da disponibilidade ao longo das semanas (Meta: 90%)
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <div className="w-full max-w-full overflow-hidden">
          <ChartContainer
            config={{
              disponibilidade: {
                label: "Disponibilidade contratual (Atlas)",
                color: "var(--chart-1)",
              },
            }}
            className="h-[130px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.data} margin={{ left: 20, right: 40, top: 18, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="semana"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickMargin={10}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                />
                <YAxis
                  domain={[80, 100]}
                  ticks={[80, 85, 90, 95, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickMargin={8}
                  axisLine={false}
                  tickLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ReferenceLine
                  y={90}
                  stroke="#f59e0b"
                  strokeDasharray="6 6"
                  strokeWidth={2}
                  ifOverflow="extendDomain"
                />
                <Line
                  type="monotone"
                  dataKey="disponibilidade"
                  stroke="var(--color-disponibilidade)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "var(--background)", stroke: "var(--color-disponibilidade)", strokeWidth: 2 }}
                  activeDot={{ r: 5 }}
                >
                  <LabelList
                    dataKey="disponibilidade"
                    position="top"
                    formatter={(value: number) => `${value}%`}
                    style={{ fontSize: 11, fontWeight: 600, fill: "var(--foreground)" }}
                  />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
        {/* Legenda */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs">
          <span className="flex items-center gap-2 text-muted-foreground">
            <span className="inline-block h-0.5 w-6 rounded-full bg-[var(--chart-1)]" />
            Disponibilidade contratual (Atlas)
          </span>
          <span className="flex items-center gap-2 text-muted-foreground">
            <span
              className="inline-block h-0.5 w-6 rounded-full"
              style={{ backgroundImage: "repeating-linear-gradient(90deg,#f59e0b 0 4px,transparent 4px 8px)" }}
            />
            Meta contratual (90%)
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
