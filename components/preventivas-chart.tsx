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
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-base font-semibold text-foreground">Execução - Preventivas</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="space-y-3">
          <div className="text-center py-1">
            <p className="text-4xl font-bold text-primary leading-none">{percentualConcluidas}%</p>
            <p className="text-sm text-muted-foreground mt-2">Estão com Preventivas Concluídas</p>
          </div>

          <div className="space-y-2 text-sm pt-1">
            <div className="flex justify-between items-center gap-3">
              <span className="flex items-center gap-2 text-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
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
                <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
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
                <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
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
