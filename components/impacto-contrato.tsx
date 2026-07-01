"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Layers, Gauge, Clock, FileText, ArrowRight } from "lucide-react"
import type { Machine } from "@/lib/types"

interface ImpactoContratoProps {
  machines: Machine[]
  onVerDetalhes?: () => void
}

// Estimativas de impacto: valores por máquina/dia usados para projeção
const HORAS_PRODUCAO_DIA = 24
const MULTA_POR_MAQUINA_CRITICA = 25000

function getDiasParada(dataParada?: string): number {
  if (!dataParada) return 0
  const inicio = new Date(dataParada).getTime()
  if (Number.isNaN(inicio)) return 0
  return Math.max(0, Math.floor((Date.now() - inicio) / 86400000))
}

export function ImpactoContrato({ machines, onVerDetalhes }: ImpactoContratoProps) {
  const { horasPerdidas, multaPotencial, nivelRisco } = useMemo(() => {
    const paradas = machines.filter((m) => m.status === "parada")
    const criticas = paradas.filter((m) => getDiasParada(m.dataParada) >= 91)

    const horasPerdidas = paradas.length * HORAS_PRODUCAO_DIA
    const multaPotencial = criticas.length * MULTA_POR_MAQUINA_CRITICA

    let nivelRisco: "ALTO" | "MÉDIO" | "BAIXO" = "BAIXO"
    if (criticas.length > 0) nivelRisco = "ALTO"
    else if (paradas.length >= 5) nivelRisco = "MÉDIO"

    return { horasPerdidas, multaPotencial, nivelRisco }
  }, [machines])

  const riscoBadgeClass =
    nivelRisco === "ALTO"
      ? "bg-destructive/10 text-destructive"
      : nivelRisco === "MÉDIO"
        ? "bg-amber-100 text-amber-700"
        : "bg-emerald-100 text-emerald-700"

  const linhas = [
    {
      icon: Gauge,
      label: "Perda de produção (estimada)",
      value: `${horasPerdidas} h`,
    },
    {
      icon: Clock,
      label: "Risco de não cumprimento de SLA",
      value: <Badge className={`${riscoBadgeClass} border-0 font-semibold`}>{nivelRisco}</Badge>,
    },
    {
      icon: FileText,
      label: "Multa potencial (estimada)",
      value: `R$ ${multaPotencial.toLocaleString("pt-BR")}`,
    },
  ]

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3 pt-5 px-5">
        <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-foreground">
          <Layers className="h-4 w-4 text-primary" />
          Impacto no Contrato
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 flex flex-col gap-4">
        <div className="space-y-4">
          {linhas.map((linha) => (
            <div key={linha.label} className="flex items-center gap-3">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <linha.icon className="h-4 w-4" />
              </span>
              <span className="flex-1 text-sm text-muted-foreground leading-tight">{linha.label}</span>
              <span className="text-sm font-semibold text-foreground tabular-nums">{linha.value}</span>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          className="w-full justify-center gap-2 border-primary/30 text-primary hover:bg-primary/5 bg-transparent"
          onClick={onVerDetalhes}
        >
          Ver análise detalhada
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  )
}
