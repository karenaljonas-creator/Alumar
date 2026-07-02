"use client"

import { useMemo } from "react"
import type { Machine, ParadaEvento, RegistroSemanal, ParadaEtapa } from "@/lib/types"
import { computeIndicadores } from "@/lib/parada-eventos-storage"
import { Card, CardContent } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { Package, Wrench, User, Pause, Truck, Settings, Clock, ArrowRight } from "lucide-react"

interface ParadaDetalheConteudoProps {
  machine: Machine
  eventos: ParadaEvento[]
  registros: RegistroSemanal[]
}

// Paleta fixa para as etapas da linha do tempo (verde, azul, laranja, vermelho, ...)
const CORES_ETAPA = ["#16a34a", "#2563eb", "#f59e0b", "#dc2626", "#0891b2", "#7c3aed"]

function corResponsavel(nome: string) {
  if (nome === "Vale") return "#dc2626"
  if (nome === "Atlas") return "#2563eb"
  return "var(--muted-foreground)"
}

function corCategoria(index: number) {
  return CORES_ETAPA[index % CORES_ETAPA.length]
}

function iconePorCategoria(categoria?: string) {
  const c = (categoria || "").toLowerCase()
  if (c.includes("peça") || c.includes("peca")) return Package
  if (c.includes("cliente")) return User
  if (c.includes("programação") || c.includes("programacao") || c.includes("recurso")) return Settings
  if (c.includes("instalação") || c.includes("instalacao") || c.includes("start")) return Wrench
  if (c.includes("manutenção") || c.includes("manutencao") || c.includes("corretiva")) return Wrench
  if (c.includes("logística") || c.includes("logistica") || c.includes("transporte")) return Truck
  return Pause
}

function formatDate(iso?: string | null) {
  if (!iso) return "-"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "-"
  return d.toLocaleDateString("pt-BR")
}

export function ParadaDetalheConteudo({ machine, eventos, registros }: ParadaDetalheConteudoProps) {
  const indicadores = useMemo(
    () => computeIndicadores(eventos, machine, registros),
    [machine, eventos, registros],
  )

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
    color: corCategoria(i),
  }))

  const donutResponsavel = porResponsavel.map((r) => ({
    name: r.nome,
    value: r.dias,
    percentual: r.percentual,
    color: corResponsavel(r.nome),
  }))

  return (
    <div className="space-y-5 p-5 bg-muted/30 rounded-lg border border-border">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-bold text-foreground">
          {machine.nome} <span className="font-normal text-muted-foreground">— {machine.tipo} | {machine.localizacao}</span>
        </h3>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>
            Mudanças de status: <span className="font-semibold text-foreground">{totalMudancas}</span>
          </span>
          <span>
            Última alteração: <span className="font-semibold text-foreground">{formatDate(ultimaAlteracao)}</span>
          </span>
        </div>
      </div>

      {/* Linha de resumo: cartões + donuts */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Tempo total + nesta categoria */}
        <Card className="border-border">
          <CardContent className="p-4 grid grid-cols-2 gap-2">
            <div className="text-center border-r border-border pr-2">
              <p className="text-[11px] text-muted-foreground leading-tight">Tempo Total de Parada</p>
              <p className="text-2xl font-bold text-destructive mt-1">{diasTotais}</p>
              <p className="text-[11px] text-muted-foreground">dias</p>
              <p className="text-[10px] text-muted-foreground mt-1">Desde {formatDate(machine.dataParada)}</p>
            </div>
            <div className="text-center pl-1">
              <p className="text-[11px] text-muted-foreground leading-tight">Nesta Categoria</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{diasNaCategoriaAtual}</p>
              <p className="text-[11px] text-muted-foreground">dias</p>
              {categoriaAtual && (
                <p className="text-[10px] text-muted-foreground mt-1 truncate">{categoriaAtual}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Responsabilidade acumulada */}
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-foreground mb-3">Responsabilidade Acumulada</p>
            {porResponsavel.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem dados.</p>
            ) : (
              <div className="space-y-2.5">
                {porResponsavel.map((r) => (
                  <div key={r.nome} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{r.nome}</span>
                      <span className="text-muted-foreground">
                        {r.dias} dias ({r.percentual}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${r.percentual}%`, backgroundColor: corResponsavel(r.nome) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Donut por categoria */}
        <DonutCard titulo="Resumo por Categoria" data={donutCategoria} />

        {/* Donut por responsável */}
        <DonutCard titulo="Resumo por Responsável" data={donutResponsavel} />
      </div>

      {/* Linha do tempo horizontal */}
      <Card className="border-border">
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-foreground mb-4">
            Histórico da Parada <span className="text-muted-foreground font-normal">(Linha do Tempo)</span>
          </p>
          <div className="overflow-x-auto pb-2">
            <div className="flex items-stretch gap-2 min-w-min">
              {etapas.map((etapa, i) => (
                <TimelineEtapa
                  key={etapa.evento.id}
                  etapa={etapa}
                  index={i}
                  isLast={i === etapas.length - 1}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function TimelineEtapa({
  etapa,
  index,
  isLast,
}: {
  etapa: ParadaEtapa
  index: number
  isLast: boolean
}) {
  const cor = etapa.atual ? "#dc2626" : corCategoria(index)
  const Icone = etapa.atual ? Pause : iconePorCategoria(etapa.evento.categoria)

  return (
    <div className="flex items-stretch">
      <div className="flex flex-col w-[220px] shrink-0">
        {/* Cabeçalho: ícone + data/categoria */}
        <div className="flex items-start gap-2 mb-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-white shrink-0"
            style={{ backgroundColor: cor }}
          >
            <Icone className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold" style={{ color: cor }}>
              {etapa.atual ? "Atual - Desde " : ""}
              {formatDate(etapa.dataInicio)}
            </p>
            <p className="text-sm font-bold text-foreground leading-tight">
              {etapa.evento.categoria || "Sem categoria"}
            </p>
          </div>
        </div>

        {/* Corpo */}
        <div className="pl-11 space-y-2 flex-1">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Ação / Responsável</p>
            <p className="text-xs text-foreground">
              {etapa.evento.acao || "-"}
              {etapa.evento.responsavel ? ` / ${etapa.evento.responsavel}` : ""}
            </p>
          </div>
          {etapa.evento.observacao && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Observação</p>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
                {etapa.evento.observacao}
              </p>
            </div>
          )}
        </div>

        {/* Barra de dias */}
        <div className="pl-11 mt-3">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
            style={{ backgroundColor: cor }}
          >
            <Clock className="h-3 w-3" />
            {etapa.dias} dias{etapa.atual ? " (em andamento)" : ""}
          </span>
        </div>
      </div>

      {/* Conector */}
      {!isLast && (
        <div className="flex items-center px-1 self-start pt-1">
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  )
}

function DonutCard({
  titulo,
  data,
}: {
  titulo: string
  data: { name: string; value: number; percentual: number; color: string }[]
}) {
  const total = data.reduce((acc, d) => acc + d.value, 0)
  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <p className="text-xs font-semibold text-foreground mb-2">{titulo}</p>
        {total === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">Sem dados.</p>
        ) : (
          <div className="flex items-center gap-3">
            <div className="relative w-[90px] h-[90px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={44}
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
                <span className="text-lg font-bold text-foreground">{total}</span>
                <span className="text-[9px] text-muted-foreground">dias</span>
              </div>
            </div>
            <div className="flex-1 space-y-1 min-w-0">
              {data.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-[11px]">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="truncate flex-1">{d.name}</span>
                  <span className="text-muted-foreground shrink-0">
                    {d.value}d ({d.percentual}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
