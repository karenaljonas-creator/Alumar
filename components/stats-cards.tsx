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
              <p className="text-base font-medium text-muted-foreground">Disponibilidade</p>
              <p className="text-4xl font-bold text-foreground mt-1">{stats.disponibilidade.toFixed(1)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
