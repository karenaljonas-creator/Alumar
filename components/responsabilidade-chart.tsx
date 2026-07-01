"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { ShieldCheck } from "lucide-react"
import type { Machine } from "@/lib/types"

interface ResponsabilidadeChartProps {
  machines: Machine[]
}

export function ResponsabilidadeChart({ machines }: ResponsabilidadeChartProps) {
  const { data, total } = useMemo(() => {
    const paradas = machines.filter((m) => m.status === "parada")
    let atlas = 0
    let vale = 0
    paradas.forEach((m) => {
      if (m.acaoResponsavel === "Atlas") atlas++
      else vale++ // Vale e indefinidos entram como Vale (cliente)
    })
    return {
      total: paradas.length,
      data: [
        { nome: "Cliente (Vale)", valor: vale, cor: "var(--chart-1)" },
        { nome: "Atlas", valor: atlas, cor: "var(--chart-4)" },
      ],
    }
  }, [machines])

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3 pt-5 px-5">
        <CardTitle className="text-base font-semibold uppercase tracking-wide text-foreground">
          Responsabilidade das Paradas
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {total === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
            Nenhuma máquina parada
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 relative">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={78}
                      dataKey="valor"
                      strokeWidth={0}
                      paddingAngle={2}
                    >
                      {data.map((entry) => (
                        <Cell key={entry.nome} fill={entry.cor} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-foreground">{total}</span>
                  <span className="text-[10px] text-muted-foreground uppercase">paradas</span>
                </div>
              </div>

              <div className="flex-1 space-y-3 min-w-0">
                {data.map((entry) => {
                  const pct = total > 0 ? Math.round((entry.valor / total) * 100) : 0
                  return (
                    <div key={entry.nome} className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.cor }} />
                      <span className="text-foreground flex-1 truncate">{entry.nome}</span>
                      <span className="font-semibold text-foreground tabular-nums">
                        {entry.valor}{" "}
                        <span className="font-normal text-muted-foreground">({pct}%)</span>
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-lg bg-secondary p-3">
              <ShieldCheck className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-medium text-secondary-foreground">Separação de responsabilidades</p>
                <p className="text-muted-foreground">Baseado nas análises registradas</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
