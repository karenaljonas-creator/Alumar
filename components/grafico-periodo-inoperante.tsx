"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList, Tooltip } from "recharts"
import type { Machine } from "@/lib/types"
import { analisarPeriodoInoperante } from "@/lib/machine-utils"
import { useMemo } from "react"

interface GraficoPeriodoInoperanteProps {
  machines: Machine[]
}

export function GraficoPeriodoInoperante({ machines }: GraficoPeriodoInoperanteProps) {
  const chartData = useMemo(() => {
    const analise = analisarPeriodoInoperante(machines)

    // Ensure all 5 categories are present in the correct order
    const categorias = ["0-15 dias", "16-30 dias", "31-60 dias", "61-90 dias", "91+ dias"]

    return categorias
      .map((faixa) => {
        const found = analise.find((item) => item.faixa === faixa)
        return {
          periodo: faixa,
          quantidade: found ? found.quantidade : 0,
        }
      })
      .filter((item) => item.quantidade > 0)
  }, [machines])

  // Altura proporcional ao número de barras para evitar espaços vazios,
  // com um mínimo para caber os eixos e um teto quando há muitas faixas.
  const chartHeight = Math.min(210, Math.max(120, chartData.length * 56 + 40))

  return (
    <Card className="border-border shadow-sm h-full flex flex-col">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-bold uppercase tracking-wide text-foreground">Período Inoperante</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">Distribuição de máquinas paradas por tempo de inatividade</CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 flex flex-1 items-center">
        <div className="w-full" style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 80, right: 40, top: 5, bottom: 5 }}
              barCategoryGap="30%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} />
              <XAxis type="number" stroke="#64748b" tick={{ fontSize: 12 }} allowDecimals={false} />
              <YAxis dataKey="periodo" type="category" width={75} stroke="#64748b" tick={{ fontSize: 13 }} />
              <Tooltip
                cursor={{ fill: "rgba(0, 146, 188, 0.06)" }}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="quantidade" fill="#0092bc" radius={[0, 6, 6, 0]} maxBarSize={44}>
                <LabelList
                  dataKey="quantidade"
                  position="right"
                  style={{ fill: "#0f172a", fontSize: 14, fontWeight: "600" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
