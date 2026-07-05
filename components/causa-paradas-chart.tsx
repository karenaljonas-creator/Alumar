"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Info } from "lucide-react"
import type { Machine } from "@/lib/types"
import { CATEGORIAS_PARADA } from "@/lib/types"

interface CausaParadasChartProps {
  machines: Machine[]
}

const BAR_COLOR = "#0092bc"
const MAX_PCT = 60

export function CausaParadasChart({ machines }: CausaParadasChartProps) {
  const { data, total } = useMemo(() => {
    const paradas = machines.filter((m) => m.status === "parada")
    const contagem = new Map<string, number>()

    paradas.forEach((m) => {
      const categoria = m.categoriaParada || "Sem categoria"
      contagem.set(categoria, (contagem.get(categoria) || 0) + 1)
    })

    const ordem = [...CATEGORIAS_PARADA, "Sem categoria"]
    const total = paradas.length
    const data = Array.from(contagem.entries())
      .map(([nome, quantidade]) => ({
        nome,
        quantidade,
        pct: total > 0 ? Math.round((quantidade / total) * 100) : 0,
      }))
      .sort((a, b) => {
        if (b.quantidade !== a.quantidade) return b.quantidade - a.quantidade
        return ordem.indexOf(a.nome) - ordem.indexOf(b.nome)
      })

    return { data, total }
  }, [machines])

  return (
    <Card className="border-border shadow-sm h-full flex flex-col">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-foreground">
            Máquinas Paradas por Causa
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
          </CardTitle>
          <span className="text-xs font-medium text-muted-foreground">% do total</span>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 flex-1 flex flex-col">
        {total === 0 ? (
          <div className="flex items-center justify-center flex-1 text-sm text-muted-foreground">
            Nenhuma máquina parada
          </div>
        ) : (
          <div className="flex flex-1 flex-col justify-between gap-3">
            <div className="flex flex-1 flex-col justify-around gap-3">
              {data.map((entry) => (
                <div key={entry.nome} className="flex items-center gap-3">
                  <span className="w-[38%] flex-shrink-0 text-left text-xs text-foreground leading-tight">
                    {entry.nome}
                  </span>
                  <div className="relative flex-1">
                    <div
                      className="h-4 rounded-sm"
                      style={{
                        width: `${Math.min((entry.pct / MAX_PCT) * 100, 100)}%`,
                        backgroundColor: BAR_COLOR,
                      }}
                    />
                  </div>
                  <span className="w-10 flex-shrink-0 text-right text-sm font-bold text-foreground tabular-nums">
                    {entry.pct}%
                  </span>
                </div>
              ))}
            </div>

            {/* Eixo X */}
            <div className="flex items-center gap-3">
              <span className="w-[38%] flex-shrink-0" />
              <div className="flex flex-1 justify-between text-[11px] text-muted-foreground tabular-nums">
                {[0, 10, 20, 30, 40, 50, 60].map((tick) => (
                  <span key={tick}>{tick}%</span>
                ))}
              </div>
              <span className="w-10 flex-shrink-0" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
