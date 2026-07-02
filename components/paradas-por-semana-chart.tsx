"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, LabelList } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { WeeklySnapshot } from "@/lib/types"
import { dedupeHistoryPorSemana } from "@/lib/machine-utils"

interface ParadasPorSemanaChartProps {
  history: WeeklySnapshot[]
  contratoFilter: string
}

export function ParadasPorSemanaChart({ history, contratoFilter }: ParadasPorSemanaChartProps) {
  const data = useMemo(() => {
    if (!history || history.length === 0) return []

    const last8 = dedupeHistoryPorSemana(history).slice(-8)

    return last8.map((snapshot) => {
      let paradas: number
      if (contratoFilter === "todos") {
        paradas = snapshot.stats.paradas
      } else {
        const machines = snapshot.machines || []
        const filtered = machines.filter((m) => {
          if (contratoFilter === "com-contrato") return m.temContrato === true
          if (contratoFilter === "sem-contrato") return m.temContrato === false
          return true
        })
        paradas = filtered.filter((m) => m.status === "parada").length
      }
      return {
        semana: `Sem ${snapshot.semana?.split("-W")[1] || "?"}`,
        paradas,
      }
    })
  }, [history, contratoFilter])

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3 pt-5 px-5">
        <CardTitle className="text-base font-semibold uppercase tracking-wide text-foreground">
          Máquinas Paradas por Semana
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Evolução do número de máquinas paradas
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[240px] text-sm text-muted-foreground">
            Nenhum dado histórico disponível
          </div>
        ) : (
          <ChartContainer
            config={{ paradas: { label: "Máquinas paradas", color: "var(--chart-1)" } }}
            className="h-[240px] w-full"
          >
            <BarChart data={data} margin={{ left: 8, right: 16, top: 24, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="semana" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} tickMargin={8} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} tickMargin={8} />
              <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "var(--muted)" }} />
              <Bar dataKey="paradas" fill="var(--color-paradas)" radius={[4, 4, 0, 0]} maxBarSize={48}>
                <LabelList
                  dataKey="paradas"
                  position="top"
                  style={{ fontSize: 12, fontWeight: 600, fill: "var(--foreground)" }}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
