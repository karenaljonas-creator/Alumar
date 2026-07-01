"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Machine, MachineStats } from "@/lib/types"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"

interface StatusChartProps {
  stats: MachineStats
  machines?: Machine[]
  contratoFilter?: string
}

export function StatusChart({ stats, machines = [] }: StatusChartProps) {
  const disponibilidade = Number(stats.disponibilidade.toFixed(1))

  // Gauge semicircular: preenchido = disponibilidade, restante = cinza
  const gaugeData = [
    { name: "Disponível", value: disponibilidade, color: "var(--chart-1)" },
    { name: "Indisponível", value: 100 - disponibilidade, color: "var(--muted)" },
  ]

  const maquinasParadas = machines.filter((m) => m.status === "parada")
  let paradasVale = 0
  let paradasAtlas = 0
  maquinasParadas.forEach((m) => {
    if (m.acaoResponsavel === "Atlas") paradasAtlas++
    else paradasVale++
  })

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-2 pt-5 px-5">
        <CardTitle className="text-base font-semibold uppercase tracking-wide text-foreground">
          Disponibilidade
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="flex flex-col items-center">
          <div className="relative w-full max-w-[280px]">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={gaugeData}
                  cx="50%"
                  cy="100%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius={90}
                  outerRadius={130}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {gaugeData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
              <span className="text-4xl font-bold text-foreground">{disponibilidade}%</span>
              <span className="text-xs text-muted-foreground">Meta: 90%</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 w-full">
            <div className="flex flex-col items-center">
              <div className="h-1 w-12 bg-[var(--chart-1)] rounded-full mb-1" />
              <p className="text-2xl font-bold text-foreground">{paradasVale}</p>
              <p className="text-xs text-muted-foreground text-center">Máquinas paradas</p>
              <p className="text-xs font-medium text-primary">Ação Vale</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="h-1 w-12 bg-[var(--muted-foreground)] rounded-full mb-1" />
              <p className="text-2xl font-bold text-foreground">{paradasAtlas}</p>
              <p className="text-xs text-muted-foreground text-center">Máquinas paradas</p>
              <p className="text-xs font-medium text-muted-foreground">Ação Atlas</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
