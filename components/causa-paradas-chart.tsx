"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import type { Machine } from "@/lib/types"
import { CATEGORIAS_PARADA } from "@/lib/types"

interface CausaParadasChartProps {
  machines: Machine[]
}

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--primary)",
  "var(--muted-foreground)",
]

export function CausaParadasChart({ machines }: CausaParadasChartProps) {
  const { data, total } = useMemo(() => {
    const paradas = machines.filter((m) => m.status === "parada")
    const contagem = new Map<string, number>()

    paradas.forEach((m) => {
      const categoria = m.categoriaParada || "Sem categoria"
      contagem.set(categoria, (contagem.get(categoria) || 0) + 1)
    })

    // Ordena seguindo a ordem oficial das categorias, com "Sem categoria" ao fim
    const ordem = [...CATEGORIAS_PARADA, "Sem categoria"]
    const data = Array.from(contagem.entries())
      .map(([nome, quantidade]) => ({ nome, quantidade }))
      .sort((a, b) => ordem.indexOf(a.nome) - ordem.indexOf(b.nome))

    return { data, total: paradas.length }
  }, [machines])

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3 pt-5 px-5">
        <CardTitle className="text-base font-semibold uppercase tracking-wide text-foreground">
          Causa das Paradas
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {total === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
            Nenhuma máquina parada
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5">
            <div className="relative">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={78}
                    dataKey="quantidade"
                    strokeWidth={0}
                    paddingAngle={2}
                  >
                    {data.map((entry, index) => (
                      <Cell key={entry.nome} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-foreground">{total}</span>
                <span className="text-[10px] text-muted-foreground uppercase">paradas</span>
              </div>
            </div>

            <div className="w-full space-y-2.5">
              {data.map((entry, index) => {
                const pct = total > 0 ? Math.round((entry.quantidade / total) * 100) : 0
                return (
                  <div key={entry.nome} className="flex items-center gap-2.5 text-sm">
                    <span
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <span className="text-foreground flex-1">{entry.nome}</span>
                    <span className="font-semibold text-foreground tabular-nums">{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
