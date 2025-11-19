"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface LocalizacaoData {
  nome: string
  quantidade: number
  maquinas: string[]
}

interface GraficoLocalizacaoProps {
  data: LocalizacaoData[]
}

export function GraficoLocalizacao({ data }: GraficoLocalizacaoProps) {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Localização das Máquinas Paradas</CardTitle>
        <CardDescription>Distribuição geográfica dos equipamentos inativos</CardDescription>
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
            <BarChart data={data} layout="vertical" margin={{ left: 120, right: 40, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} />
              <XAxis type="number" stroke="#64748b" tick={{ fontSize: 12 }} />
              <YAxis dataKey="nome" type="category" width={115} stroke="#0f172a" tick={{ fontSize: 12 }} />
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
