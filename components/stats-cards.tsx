import { Card, CardContent } from "@/components/ui/card"
import type { MachineStats } from "@/lib/types"
import { Settings, AlertTriangle, Activity } from "lucide-react"

interface StatsCardsProps {
  stats: MachineStats
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="border-border shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-teal-500/10 flex items-center justify-center flex-shrink-0">
              <Settings className="h-5 w-5 text-teal-600" />
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-base font-medium text-muted-foreground">Máquinas Operacionais</p>
              <p className="text-4xl font-bold text-foreground mt-1">{stats.operacionais}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-base font-medium text-muted-foreground">Máquinas Paradas</p>
              <p className="text-4xl font-bold text-foreground mt-1">{stats.paradas}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-teal-500/10 flex items-center justify-center flex-shrink-0">
              <Activity className="h-5 w-5 text-teal-600" />
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <p className="text-base font-medium text-muted-foreground">Disponibilidade</p>
                <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">CONTRATO</span>
              </div>
              <p className="text-4xl font-bold text-foreground mt-1">{stats.disponibilidadeContrato.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                Considera apenas paradas Atlas ({stats.paradasAtlas})
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
