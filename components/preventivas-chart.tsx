"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react"

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
            <p className="text-6xl font-bold text-primary">{percentualConcluidas}%</p>
            <p className="text-base text-muted-foreground mt-2">Estão com Preventivas Concluídas</p>
          </div>

          <div className="space-y-3 text-base pt-2">
            <div className="flex justify-between items-center gap-3">
              <span className="flex items-center gap-2 text-foreground">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                Preventivas em dia
              </span>
              <span className="font-bold text-foreground whitespace-nowrap">
                {preventivas.ok}{" "}
                <span className="font-normal text-muted-foreground">
                  ({((preventivas.ok / preventivas.total) * 100).toFixed(1)}%)
                </span>
              </span>
            </div>
            <div className="flex justify-between items-center gap-3">
              <span className="flex items-center gap-2 text-foreground">
                <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                Em andamento / execução
              </span>
              <span className="font-bold text-foreground whitespace-nowrap">
                {preventivas.emPlanejamento}{" "}
                <span className="font-normal text-muted-foreground">
                  ({((preventivas.emPlanejamento / preventivas.total) * 100).toFixed(1)}%)
                </span>
              </span>
            </div>
            <div className="flex justify-between items-center gap-3">
              <span className="flex items-center gap-2 text-foreground">
                <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                Preventivas atrasadas
              </span>
              <span className="font-bold text-foreground whitespace-nowrap">
                {preventivas.emAtraso}{" "}
                <span className="font-normal text-muted-foreground">
                  ({((preventivas.emAtraso / preventivas.total) * 100).toFixed(1)}%)
                </span>
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
