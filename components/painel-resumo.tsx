"use client"

import type { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import type { MachineStats } from "@/lib/types"
import { AlertTriangle, Activity, ShieldCheck, Shield, Info } from "lucide-react"

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
    <div className="grid gap-3 lg:grid-cols-4 lg:items-stretch">
      {/* Card grande: Disponibilidade da Planta (Física) */}
      <Card
        className="border-0 shadow-sm text-white overflow-hidden"
        style={{ backgroundColor: "#12466b" }}
      >
        <CardContent className="flex h-full flex-col justify-around gap-4 px-5 py-5">
          {/* Disponibilidade física */}
          <div className="text-center">
            <p className="flex items-center justify-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-white/70">
              Disponibilidade da Planta (Física)
              <Info className="h-4 w-4 text-white/50" />
            </p>
            <p className="mt-2 text-7xl font-bold leading-none tracking-tight">
              {stats.disponibilidade.toFixed(1).replace(".", ",")}%
            </p>
            <p className="mt-3 text-base font-semibold text-white/90">Meta: {META}%</p>
            <div className="mx-auto mt-4 h-0 w-full border-b-2 border-dashed border-amber-400/80" />
          </div>

          {/* Responsáveis pela indisponibilidade */}
          <div>
            <p className="text-center text-sm font-medium text-white/70">
              Principais responsáveis pela indisponibilidade
            </p>
            <div className="mt-3 flex items-stretch justify-center">
              <div className="flex flex-1 flex-col items-center">
                <p className="text-5xl font-bold leading-none text-red-500">{stats.paradasVale}</p>
                <p className="mt-2 text-center text-xs text-white/70">máquinas paradas</p>
                <span className="mt-2 whitespace-nowrap rounded bg-red-500 px-3 py-1 text-xs font-semibold">Ação Vale</span>
              </div>
              {/* Divisor VS com linhas verticais e círculo */}
              <div className="flex flex-col items-center justify-center px-3">
                <div className="w-px flex-1 bg-white/20" />
                <div className="my-1 flex h-9 w-9 items-center justify-center rounded-full border border-white/25">
                  <span className="text-xs font-bold text-white/70">VS</span>
                </div>
                <div className="w-px flex-1 bg-white/20" />
              </div>
              <div className="flex flex-1 flex-col items-center">
                <p className="text-5xl font-bold leading-none text-sky-400">{stats.paradasAtlas}</p>
                <p className="mt-2 text-center text-xs text-white/70">máquinas paradas</p>
                <span className="mt-2 whitespace-nowrap rounded bg-white/15 px-3 py-1 text-xs font-semibold">Ação Atlas</span>
              </div>
            </div>
          </div>

          {/* Disponibilidade contratual Atlas */}
          <div className="flex items-center justify-center gap-4 border-t border-white/15 pt-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white/10">
              <Shield className="h-6 w-6 text-white/90" fill="currentColor" fillOpacity={0.15} />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
                Disponibilidade Contratual Atlas
              </p>
              <p className="text-3xl font-bold leading-none">
                {stats.disponibilidadeContrato.toFixed(1).replace(".", ",")}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coluna direita: KPIs (altura fixa) em cima, gráfico preenche o resto */}
      <div className="flex flex-col gap-3 lg:col-span-3">
      <div className="grid h-fit gap-3 shrink-0 sm:grid-cols-[1fr_1fr_1.55fr]">
      {/* Máquinas Paradas */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide leading-tight text-muted-foreground">
              Máquinas Paradas
            </p>
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
          </div>
          <p className="mt-0.5 text-4xl font-bold leading-none text-red-600">{stats.paradas}</p>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Impacto no contrato: <span className={`font-bold ${impactoColor}`}>{impacto}</span>
          </p>
        </CardContent>
      </Card>

      {/* Máquinas Operacionais */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide leading-tight text-muted-foreground">
              Máquinas Operacionais
            </p>
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
          </div>
          <p className="mt-0.5 text-4xl font-bold leading-none text-primary">
            {stats.operacionais} <span className="text-2xl text-muted-foreground">/ {stats.total}</span>
          </p>
          <p className="mt-1.5 text-[11px] text-muted-foreground">Total de máquinas</p>
        </CardContent>
      </Card>

      {/* Preventivas Concluídas */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide leading-tight text-muted-foreground">
              Preventivas Concluídas
            </p>
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/10">
              <ShieldCheck className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          <div className="mt-0.5 flex items-end justify-between gap-4">
            <div>
              <p className="text-4xl font-bold leading-none text-amber-600">
                {preventivasPct.toFixed(1).replace(".", ",")}%
              </p>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {preventivas.ok} de {preventivas.total} concluídas
              </p>
            </div>
            <div className="space-y-1 border-l border-border pl-4 text-[11px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-primary">Preventivas em dia</span>
                <span className="font-bold text-emerald-600">{preventivas.ok}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-primary">Em andamento / execução</span>
                <span className="font-bold text-foreground">{preventivas.emPlanejamento}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-primary">Preventivas atrasadas</span>
                <span className="font-bold text-red-600">{preventivas.emAtraso}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Gráfico de disponibilidade semanal (altura natural) */}
      <div className="min-w-0">{chart}</div>
      </div>
    </div>
  )
}
