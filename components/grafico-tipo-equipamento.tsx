"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface TipoEquipamentoData {
  nome: string
  quantidade: number
  maquinas: string[]
}

interface GraficoTipoEquipamentoProps {
  data: TipoEquipamentoData[]
}

export function GraficoTipoEquipamento({ data }: GraficoTipoEquipamentoProps) {
  const maquinasParadas = data.filter((item) => ["Compressor", "Secador", "Soprador"].includes(item.nome))

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Máquinas Paradas por Tipo</CardTitle>
        <CardDescription>Distribuição de equipamentos parados por categoria</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            quantidade: {
              label: "Quantidade",
              color: "#94a3b8",
            },
          }}
          className="h-[280px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={maquinasParadas} layout="vertical" margin={{ left: 80, right: 40, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} />
              <XAxis type="number" stroke="#64748b" tick={{ fontSize: 12 }} />
              <YAxis dataKey="nome" type="category" width={75} stroke="#0f172a" tick={{ fontSize: 13 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="quantidade" fill="#94a3b8" radius={[0, 6, 6, 0]}>
                <LabelList
                  dataKey="quantidade"
                  position="right"
                  style={{ fill: "#0f172a", fontSize: 14, fontWeight: "600" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
