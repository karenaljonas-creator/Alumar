import { Card, CardContent } from "@/components/ui/card"
import type { MachineStats } from "@/lib/types"
import { Activity, AlertTriangle, Truck, ShieldCheck, ArrowUp, ArrowDown } from "lucide-react"

interface PreventivasResumo {
  ok: number
  total: number
}

interface StatsTrend {
  disponibilidadeDelta: number
  paradasDelta: number
}

interface StatsCardsProps {
  stats: MachineStats
  preventivas?: PreventivasResumo
  trend?: StatsTrend
}

const META_DISPONIBILIDADE = 90

export function StatsCards({ stats, preventivas, trend }: StatsCardsProps) {
  const preventivasPct = preventivas && preventivas.total > 0 ? (preventivas.ok / preventivas.total) * 100 : 0

  // Impacto no contrato baseado nas paradas de responsabilidade Atlas
  const impacto = stats.paradasAtlas >= 3 ? "ALTO" : stats.paradasAtlas >= 1 ? "MÉDIO" : "BAIXO"
  const impactoColor =
    impacto === "ALTO" ? "text-red-600" : impacto === "MÉDIO" ? "text-amber-600" : "text-emerald-600"

  const disponibilidadeFill = Math.min(stats.disponibilidadeContrato, 100)

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* Disponibilidade */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Disponibilidade</p>
                <span className="text-[10px] font-bold uppercase text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                  Contrato
                </span>
              </div>
              <p className="text-3xl font-bold text-foreground mt-1 leading-none">
                {stats.disponibilidadeContrato.toFixed(1)}%
              </p>
              {trend && (
                <DeltaLine value={trend.disponibilidadeDelta} suffix="%" positiveIsGood unit="vs semana passada" />
              )}
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Meta: {META_DISPONIBILIDADE}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${disponibilidadeFill}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Máquinas Paradas */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Máquinas Paradas</p>
                {stats.paradas >= 8 && (
                  <span className="text-[10px] font-bold uppercase text-red-600 bg-red-500/10 px-1.5 py-0.5 rounded">
                    Crítico
                  </span>
                )}
              </div>
              <p className="text-3xl font-bold text-foreground mt-1 leading-none">{stats.paradas}</p>
              {trend && <DeltaLine value={trend.paradasDelta} positiveIsGood={false} unit="vs semana passada" />}
            </div>
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            Impacto no contrato: <span className={`font-bold ${impactoColor}`}>{impacto}</span>
          </div>
        </CardContent>
      </Card>

      {/* Máquinas Operacionais */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Máquinas Operacionais
              </p>
              <p className="text-3xl font-bold text-foreground mt-1 leading-none">{stats.operacionais}</p>
              <p className="text-xs text-muted-foreground mt-2">de {stats.total}</p>
            </div>
          </div>
          <div className="mt-4 text-xs text-muted-foreground">Total de máquinas</div>
        </CardContent>
      </Card>

      {/* Preventivas Concluídas */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Preventivas Concluídas
              </p>
              <p className="text-3xl font-bold text-foreground mt-1 leading-none">{preventivasPct.toFixed(1)}%</p>
              {preventivas && (
                <p className="text-xs text-muted-foreground mt-2">
                  {preventivas.ok} de {preventivas.total} concluídas
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface DeltaLineProps {
  value: number
  suffix?: string
  unit: string
  positiveIsGood: boolean
}

function DeltaLine({ value, suffix = "", unit, positiveIsGood }: DeltaLineProps) {
  const isUp = value > 0
  const isFlat = value === 0
  const good = positiveIsGood ? value >= 0 : value <= 0
  const color = isFlat ? "text-muted-foreground" : good ? "text-emerald-600" : "text-red-600"
  const Icon = isUp ? ArrowUp : ArrowDown
  const display = `${Math.abs(value).toFixed(suffix === "%" ? 1 : 0)}${suffix}`

  return (
    <p className={`text-xs mt-1.5 flex items-center gap-1 ${color}`}>
      {!isFlat && <Icon className="h-3 w-3" />}
      <span className="font-semibold">{display}</span>
      <span className="text-muted-foreground">{unit}</span>
    </p>
  )
}
