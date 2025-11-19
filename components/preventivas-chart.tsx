"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface PreventivasChartProps {
  preventivas: {
    ok: number
    emAtraso: number
    emPlanejamento: number
    foraContrato?: number
    total: number
  }
}

export function PreventivasChart({ preventivas }: PreventivasChartProps) {
  const percentualConcluidas = preventivas.total > 0 ? ((preventivas.ok / preventivas.total) * 100).toFixed(1) : "0.0"

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3 pt-6 px-6">
        <CardTitle className="text-xl font-semibold text-foreground">Execução - Preventivas</CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="space-y-4">
          <div className="text-center py-2">
            <p className="text-6xl font-bold text-[#1e5a8e]">{percentualConcluidas}%</p>
            <p className="text-base text-muted-foreground mt-2">Estão com Preventivas Concluídas</p>
          </div>

          <div className="space-y-2 text-base pt-2">
            <div className="flex justify-between items-center">
              <span className="text-foreground">Preventivas em dia:</span>
              <span className="font-bold text-foreground">
                {preventivas.ok}{" "}
                <span className="font-normal">({((preventivas.ok / preventivas.total) * 100).toFixed(1)}%)</span>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-foreground">Em andamento / execução:</span>
              <span className="font-bold text-foreground">
                {preventivas.emPlanejamento}{" "}
                <span className="font-normal">
                  ({((preventivas.emPlanejamento / preventivas.total) * 100).toFixed(1)}%)
                </span>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-foreground">Preventivas atrasadas:</span>
              <span className="font-bold text-foreground">
                {preventivas.emAtraso}{" "}
                <span className="font-normal">({((preventivas.emAtraso / preventivas.total) * 100).toFixed(1)}%)</span>
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
