"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ReferenceLine, LabelList } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { WeeklySnapshot } from "@/lib/types"

interface TendenciaDisponibilidadeChartProps {
  history: WeeklySnapshot[]
  contratoFilter: string
}

export function TendenciaDisponibilidadeChart({ history, contratoFilter }: TendenciaDisponibilidadeChartProps) {
  const data = useMemo(() => {
    if (!history || history.length === 0) return []

    const last8 = [...history]
      .sort((a, b) => new Date(a.dataRegistro).getTime() - new Date(b.dataRegistro).getTime())
      .slice(-8)

    return last8.map((snapshot) => {
      let disponibilidade: number
      if (contratoFilter === "todos") {
        disponibilidade = snapshot.stats.disponibilidade
      } else {
        const machines = snapshot.machines || []
        const filtered = machines.filter((m) => {
          if (contratoFilter === "com-contrato") return m.temContrato === true
          if (contratoFilter === "sem-contrato") return m.temContrato === false
          return true
        })
        const operacionais = filtered.filter((m) => m.status === "operacional").length
        const total = filtered.length
        disponibilidade = total > 0 ? (operacionais / total) * 100 : 0
      }
      return {
        semana: `Sem ${snapshot.semana?.split("-W")[1] || "?"}`,
        disponibilidade: Number(disponibilidade.toFixed(1)),
      }
    })
  }, [history, contratoFilter])

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3 pt-5 px-5">
        <CardTitle className="text-base font-semibold uppercase tracking-wide text-foreground">
          Tendência de Disponibilidade
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Evolução da disponibilidade x meta (90%)
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[240px] text-sm text-muted-foreground">
            Nenhum dado histórico disponível
          </div>
        ) : (
          <ChartContainer
            config={{
              disponibilidade: { label: "Disponibilidade (%)", color: "var(--chart-1)" },
            }}
            className="h-[240px] w-full"
          >
            <LineChart data={data} margin={{ left: 8, right: 24, top: 24, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="semana" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} tickMargin={8} />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                tickMargin={8}
                tickFormatter={(v) => `${v}%`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ReferenceLine
                y={90}
                stroke="var(--chart-4)"
                strokeDasharray="4 4"
                label={{ value: "Meta 90%", position: "right", fontSize: 11, fill: "var(--chart-4)" }}
              />
              <Line
                type="monotone"
                dataKey="disponibilidade"
                stroke="var(--color-disponibilidade)"
                strokeWidth={3}
                dot={{ r: 4, fill: "var(--color-disponibilidade)" }}
                activeDot={{ r: 6 }}
              >
                <LabelList
                  dataKey="disponibilidade"
                  position="top"
                  formatter={(v: number) => `${v}%`}
                  style={{ fontSize: 11, fontWeight: 600, fill: "var(--foreground)" }}
                />
              </Line>
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
