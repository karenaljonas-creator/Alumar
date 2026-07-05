"use client"

import type { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import type { MachineStats } from "@/lib/types"
import { AlertTriangle, Activity, ShieldCheck, Shield } from "lucide-react"

interface PreventivasResumo {
  ok: number
  emAtraso: number
  emPlanejamento: number
  total: number
}

interface StatsTrend {
  disponibilidadeDelta: number
  paradasDelta: number
}

interface PainelResumoProps {
  stats: MachineStats
  preventivas: PreventivasResumo
  trend?: StatsTrend
  /** Gráfico de disponibilidade semanal renderizado ao lado dos KPIs */
  chart: ReactNode
}

const META = 90

export function PainelResumo({ stats, preventivas, chart }: PainelResumoProps) {
  const impacto = stats.paradasAtlas >= 3 ? "ALTO" : stats.paradasAtlas >= 1 ? "MÉDIO" : "BAIXO"
  const impactoColor =
    impacto === "ALTO" ? "text-red-600" : impacto === "MÉDIO" ? "text-amber-600" : "text-emerald-600"

  const preventivasPct = preventivas.total > 0 ? (preventivas.ok / preventivas.total) * 100 : 0

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {/* Card grande: Disponibilidade da Planta (Física) */}
      <Card
        className="lg:row-span-2 border-0 shadow-sm text-white overflow-hidden"
        style={{ backgroundColor: "#12466b" }}
      >
        <CardContent className="flex h-full flex-col p-5">
          {/* Disponibilidade física */}
          <p className="text-xs font-semibold uppercase tracking-wide text-white/70 flex items-center gap-2">
            Disponibilidade da Planta (Física)
          </p>
          <p className="mt-2 text-5xl font-bold leading-none">{stats.disponibilidade.toFixed(1).replace(".", ",")}%</p>
          <div className="mt-2 h-0.5 w-16 rounded-full border-b-2 border-dashed border-amber-400" />
          <p className="mt-2 text-sm font-medium text-white/80">Meta: {META}%</p>

          {/* Responsáveis pela indisponibilidade */}
          <div className="mt-6 border-t border-white/15 pt-4">
            <p className="text-center text-xs font-medium text-white/70">
              Principais responsáveis pela indisponibilidade
            </p>
            <div className="mt-3 flex items-center justify-center gap-4">
              <div className="flex flex-1 flex-col items-center">
                <p className="text-3xl font-bold leading-none text-red-400">{stats.paradasVale}</p>
                <p className="mt-1 text-center text-[11px] text-white/70">máquinas paradas</p>
                <span className="mt-2 rounded bg-red-500 px-2 py-0.5 text-[11px] font-semibold">Ação Vale</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold text-white/50">VS</span>
              </div>
              <div className="flex flex-1 flex-col items-center">
                <p className="text-3xl font-bold leading-none">{stats.paradasAtlas}</p>
                <p className="mt-1 text-center text-[11px] text-white/70">máquinas paradas</p>
                <span className="mt-2 rounded bg-white/15 px-2 py-0.5 text-[11px] font-semibold">Ação Atlas</span>
              </div>
            </div>
          </div>

          {/* Disponibilidade contratual Atlas */}
          <div className="mt-auto flex items-center gap-3 border-t border-white/15 pt-4">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-white/25">
              <Shield className="h-5 w-5 text-white/80" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
                Disponibilidade Contratual Atlas
              </p>
              <p className="text-2xl font-bold leading-none">
                {stats.disponibilidadeContrato.toFixed(1).replace(".", ",")}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Máquinas Paradas */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Máquinas Paradas</p>
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
          </div>
          <p className="mt-2 text-4xl font-bold leading-none text-red-600">{stats.paradas}</p>
          <p className="mt-4 text-xs text-muted-foreground">
            Impacto no contrato: <span className={`font-bold ${impactoColor}`}>{impacto}</span>
          </p>
        </CardContent>
      </Card>

      {/* Máquinas Operacionais */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Máquinas Operacionais</p>
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Activity className="h-4 w-4 text-primary" />
            </div>
          </div>
          <p className="mt-2 text-4xl font-bold leading-none text-primary">
            {stats.operacionais} <span className="text-2xl text-muted-foreground">/ {stats.total}</span>
          </p>
          <p className="mt-4 text-xs text-muted-foreground">Total de máquinas</p>
        </CardContent>
      </Card>

      {/* Preventivas Concluídas */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preventivas Concluídas</p>
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/10">
              <ShieldCheck className="h-4 w-4 text-amber-600" />
            </div>
          </div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="mt-2 text-4xl font-bold leading-none text-amber-600">
                {preventivasPct.toFixed(1).replace(".", ",")}%
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                {preventivas.ok} de {preventivas.total} concluídas
              </p>
            </div>
            <div className="space-y-1 border-l border-border pl-3 text-[11px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Preventivas em dia</span>
                <span className="font-bold text-foreground">{preventivas.ok}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Em andamento / execução</span>
                <span className="font-bold text-foreground">{preventivas.emPlanejamento}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Preventivas atrasadas</span>
                <span className="font-bold text-foreground">{preventivas.emAtraso}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de disponibilidade semanal ocupa as 3 colunas restantes */}
      <div className="lg:col-span-3 min-w-0">{chart}</div>
    </div>
  )
}
