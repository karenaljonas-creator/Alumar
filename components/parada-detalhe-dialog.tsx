"use client"

import { useMemo } from "react"
import type { Machine, ParadaEvento } from "@/lib/types"
import { computeIndicadores } from "@/lib/parada-eventos-storage"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { Clock, Layers, History, CalendarClock, MapPin } from "lucide-react"

interface ParadaDetalheDialogProps {
  machine: Machine | null
  eventos: ParadaEvento[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DONUT_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

function corResponsavel(nome: string) {
  if (nome === "Vale") return "var(--chart-1)"
  if (nome === "Atlas") return "var(--chart-2)"
  return "var(--muted-foreground)"
}

function formatDate(iso?: string | null) {
  if (!iso) return "-"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "-"
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
}

export function ParadaDetalheDialog({ machine, eventos, open, onOpenChange }: ParadaDetalheDialogProps) {
  const indicadores = useMemo(() => {
    if (!machine) return null
    return computeIndicadores(eventos, machine)
  }, [machine, eventos])

  if (!machine || !indicadores) return null

  const {
    diasTotais,
    categoriaAtual,
    diasNaCategoriaAtual,
    etapas,
    porCategoria,
    porResponsavel,
    totalMudancas,
    ultimaAlteracao,
  } = indicadores

  const donutCategoria = porCategoria.map((c, i) => ({
    name: c.nome,
    value: c.dias,
    percentual: c.percentual,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }))

  const donutResponsavel = porResponsavel.map((r) => ({
    name: r.nome,
    value: r.dias,
    percentual: r.percentual,
    color: corResponsavel(r.nome),
  }))

  // Linha do tempo mais recente primeiro
  const timeline = [...etapas].reverse()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="text-xl">
            <div className="flex flex-wrap items-center gap-3">
              <History className="h-5 w-5 text-primary" />
              <span className="font-bold">{machine.nome}</span>
              <span className="text-muted-foreground font-normal text-base">{machine.tipo}</span>
              {categoriaAtual && <Badge variant="secondary">{categoriaAtual}</Badge>}
            </div>
          </DialogTitle>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
            <MapPin className="h-3.5 w-3.5" />
            {machine.localizacao}
          </p>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Cartões de resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-border">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="rounded-full bg-destructive/10 p-3">
                  <Clock className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Tempo Total de Parada</p>
                  <p className="text-3xl font-bold text-foreground">
                    {diasTotais} <span className="text-base font-medium text-muted-foreground">dias</span>
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <Layers className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Nesta Categoria</p>
                  <p className="text-3xl font-bold text-foreground">
                    {diasNaCategoriaAtual}{" "}
                    <span className="text-base font-medium text-muted-foreground">dias</span>
                  </p>
                  {categoriaAtual && <p className="text-xs text-muted-foreground mt-0.5">{categoriaAtual}</p>}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Responsabilidade acumulada */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide">
                Responsabilidade Acumulada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {porResponsavel.length === 0 && (
                <p className="text-sm text-muted-foreground">Sem dados de responsabilidade.</p>
              )}
              {porResponsavel.map((r) => (
                <div key={r.nome} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{r.nome}</span>
                    <span className="text-muted-foreground">
                      {r.dias} dias ({r.percentual}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${r.percentual}%`, backgroundColor: corResponsavel(r.nome) }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Donuts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DonutCard titulo="Resumo por Categoria" data={donutCategoria} centroLabel="Categorias" />
            <DonutCard titulo="Resumo por Responsável" data={donutResponsavel} centroLabel="Responsáveis" />
          </div>

          {/* Estatísticas rápidas */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <History className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Mudanças de status</p>
                  <p className="text-xl font-bold">{totalMudancas}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <CalendarClock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Última alteração</p>
                  <p className="text-xl font-bold">{formatDate(ultimaAlteracao)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Linha do tempo */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide">
                Histórico da Parada — Linha do Tempo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative border-l-2 border-border ml-3 space-y-6">
                {timeline.map((etapa, i) => (
                  <li key={etapa.evento.id + i} className="ml-6">
                    <span
                      className={`absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-background ${
                        etapa.atual ? "bg-destructive" : "bg-primary"
                      }`}
                    />
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <time className="text-sm font-semibold text-foreground">
                        {formatDate(etapa.dataInicio)}
                      </time>
                      {etapa.atual && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          Etapa atual
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {etapa.dias} dia{etapa.dias !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {etapa.evento.categoria && (
                        <Badge variant="secondary" className="text-xs">
                          {etapa.evento.categoria}
                        </Badge>
                      )}
                      {etapa.evento.acao && (
                        <span className="text-xs text-muted-foreground">
                          Ação: <span className="font-medium text-foreground">{etapa.evento.acao}</span>
                        </span>
                      )}
                      {etapa.evento.responsavel && (
                        <span className="text-xs text-muted-foreground">
                          Resp.: <span className="font-medium text-foreground">{etapa.evento.responsavel}</span>
                        </span>
                      )}
                    </div>
                    {etapa.evento.observacao && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{etapa.evento.observacao}</p>
                    )}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DonutCard({
  titulo,
  data,
  centroLabel,
}: {
  titulo: string
  data: { name: string; value: number; percentual: number; color: string }[]
  centroLabel: string
}) {
  const total = data.reduce((acc, d) => acc + d.value, 0)
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide">{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Sem dados suficientes.</p>
        ) : (
          <div className="flex items-center gap-4">
            <div className="relative w-[140px] h-[140px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={68}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {data.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-foreground">{total}</span>
                <span className="text-[10px] text-muted-foreground">dias</span>
              </div>
            </div>
            <div className="flex-1 space-y-1.5 min-w-0">
              {data.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-sm">
                  <span className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="truncate flex-1">{d.name}</span>
                  <span className="text-muted-foreground shrink-0">{d.percentual}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
