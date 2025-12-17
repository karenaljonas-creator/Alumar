"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Machine, MachineStats } from "@/lib/types"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"

interface StatusChartProps {
  stats: MachineStats
  machines?: Machine[]
  contratoFilter?: string
}

export function StatusChart({ stats, machines = [], contratoFilter = "todos" }: StatusChartProps) {
  const data = [
    { name: "Operacionais", value: stats.operacionais, color: "#1e5a8e" },
    { name: "Paradas", value: stats.paradas, color: "#9ca3af" },
  ]

  const paradasMachines = machines.filter((m) => m.status === "parada")
  console.log("[v0] Status Chart - Todas as máquinas paradas:")
  paradasMachines.forEach((m) => {
    console.log(`  TAG: ${m.tag}, acaoResponsavel: "${m.acaoResponsavel}", tipo: ${typeof m.acaoResponsavel}`)
  })

  const paradasVale = machines.filter(
    (m) => m.status === "parada" && m.acaoResponsavel?.toLowerCase() === "vale",
  ).length
  const paradasAtlas = machines.filter(
    (m) => m.status === "parada" && m.acaoResponsavel?.toLowerCase() === "atlas",
  ).length

  console.log("[v0] Status Chart - Máquinas paradas:", paradasMachines.length)
  console.log("[v0] Status Chart - Paradas Vale:", paradasVale)
  console.log("[v0] Status Chart - Paradas Atlas:", paradasAtlas)

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3 pt-6 px-6">
        <CardTitle className="text-xl font-semibold text-foreground">Disponibilidade</CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="flex items-center gap-8">
          <div className="flex-shrink-0 relative">
            <ResponsiveContainer width={240} height={240}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  fill="#8884d8"
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-5xl font-bold text-foreground">{stats.disponibilidade.toFixed(1)}%</p>
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-1 w-12 bg-[#991b1b] rounded-full"></div>
              <div>
                <p className="text-3xl font-bold text-foreground">{paradasVale}</p>
                <p className="text-base font-medium text-muted-foreground">Máquinas Paradas</p>
                <p className="text-sm font-medium text-foreground bg-muted px-2 py-0.5 rounded inline-block mt-1">
                  Ação Vale
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-1 w-12 bg-[#9ca3af] rounded-full"></div>
              <div>
                <p className="text-3xl font-bold text-foreground">{paradasAtlas}</p>
                <p className="text-base font-medium text-muted-foreground">Máquinas Paradas</p>
                <p className="text-sm font-medium text-foreground bg-muted px-2 py-0.5 rounded inline-block mt-1">
                  Ação Atlas
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
