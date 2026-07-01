"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import type { Machine } from "@/lib/types"
import { calcularDiasParada } from "@/lib/machine-utils"

interface TopMaquinasCriticasProps {
  machines: Machine[]
  onVerTodas?: () => void
}

export function TopMaquinasCriticas({ machines, onVerTodas }: TopMaquinasCriticasProps) {
  const top5 = useMemo(() => {
    return machines
      .filter((m) => m.status === "parada")
      .map((m) => ({
        ...m,
        dias: calcularDiasParada(m.dataParada),
      }))
      .sort((a, b) => b.dias - a.dias)
      .slice(0, 5)
  }, [machines])

  const formatData = (iso?: string) => {
    if (!iso) return "-"
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return "-"
    return d.toLocaleDateString("pt-BR")
  }

  return (
    <Card className="border-border shadow-sm h-full flex flex-col">
      <CardHeader className="pb-3 pt-5 px-5">
        <CardTitle className="text-base font-semibold uppercase tracking-wide text-foreground">
          Top 5 Máquinas Críticas
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 flex-1 flex flex-col">
        {top5.length === 0 ? (
          <div className="flex items-center justify-center flex-1 text-sm text-muted-foreground">
            Nenhuma máquina parada
          </div>
        ) : (
          <div className="flex flex-col flex-1">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[440px]">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border">
                    <th className="pb-2 font-medium">Equipamento</th>
                    <th className="pb-2 font-medium">Localização</th>
                    <th className="pb-2 font-medium">Dias parado</th>
                    <th className="pb-2 font-medium">Ação</th>
                    <th className="pb-2 font-medium">Última atualização</th>
                  </tr>
                </thead>
                <tbody>
                  {top5.map((m) => {
                    const critico = m.dias >= 90
                    const acao = m.acaoResponsavel ?? "-"
                    return (
                      <tr key={m.id} className="border-b border-border/50 last:border-0">
                        <td className="py-4 font-semibold text-foreground">{m.nome}</td>
                        <td className="py-4 text-muted-foreground">{m.localizacao}</td>
                        <td className={`py-4 font-semibold ${critico ? "text-destructive" : "text-foreground"}`}>
                          {m.dias >= 90 ? "91+ dias" : `${m.dias} dias`}
                        </td>
                        <td className={`py-4 font-medium ${m.acaoResponsavel === "Atlas" ? "text-primary" : "text-foreground"}`}>
                          {acao}
                        </td>
                        <td className="py-4 text-muted-foreground">{formatData(m.updated_at || m.dataParada)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {onVerTodas && (
              <div className="flex justify-center pt-4 mt-auto">
                <Button variant="outline" size="sm" onClick={onVerTodas} className="gap-2">
                  Ver todas as máquinas paradas
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
