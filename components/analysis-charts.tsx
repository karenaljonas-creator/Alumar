"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, LabelList } from "recharts"
import type { AnalysisGroup } from "@/lib/types"

interface AnalysisChartsProps {
  periodoInoperante: AnalysisGroup[]
  porTipo: AnalysisGroup[]
  porLocalizacao: AnalysisGroup[]
  acaoResponsavel: AnalysisGroup[]
  preventivas: Array<AnalysisGroup & { percentual: string }>
}

export function AnalysisCharts({
  periodoInoperante,
  porTipo,
  porLocalizacao,
  acaoResponsavel,
  preventivas,
}: AnalysisChartsProps) {
  const COLORS = {
    red: "#C00000", // Vermelho para máquinas paradas
    yellow: "#FFC000", // Amarelo para em planejamento
    green: "#00B050", // Verde para OK
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Período Inoperante */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Período Inoperante</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={periodoInoperante} layout="vertical" margin={{ left: 40, right: 40, top: 10, bottom: 10 }}>
              <XAxis type="number" hide />
              <YAxis
                dataKey="faixa"
                type="category"
                stroke="hsl(var(--foreground))"
                tick={{ fontSize: 13 }}
                width={50}
              />
              <Bar dataKey="quantidade" fill={COLORS.red} radius={[0, 4, 4, 0]}>
                <LabelList
                  dataKey="quantidade"
                  position="right"
                  style={{ fill: "hsl(var(--foreground))", fontSize: 14, fontWeight: "bold" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Por Tipo */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Tipo de Equipamento</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={porTipo} layout="vertical" margin={{ left: 80, right: 40, top: 10, bottom: 10 }}>
              <XAxis type="number" hide />
              <YAxis
                dataKey="nome"
                type="category"
                stroke="hsl(var(--foreground))"
                tick={{ fontSize: 13 }}
                width={75}
              />
              <Bar dataKey="quantidade" fill={COLORS.red} radius={[0, 4, 4, 0]}>
                <LabelList
                  dataKey="quantidade"
                  position="right"
                  style={{ fill: "hsl(var(--foreground))", fontSize: 14, fontWeight: "bold" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Por Localização */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Localização</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={porLocalizacao} layout="vertical" margin={{ left: 120, right: 40, top: 10, bottom: 10 }}>
              <XAxis type="number" hide />
              <YAxis
                dataKey="nome"
                type="category"
                stroke="hsl(var(--foreground))"
                tick={{ fontSize: 12 }}
                width={115}
              />
              <Bar dataKey="quantidade" fill={COLORS.red} radius={[0, 4, 4, 0]}>
                <LabelList
                  dataKey="quantidade"
                  position="right"
                  style={{ fill: "hsl(var(--foreground))", fontSize: 14, fontWeight: "bold" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Disponibilidade e Preventivas Cards */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Disponibilidade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl font-bold text-primary">
                {preventivas.reduce((acc, p) => acc + p.quantidade, 0) > 0
                  ? Math.round(
                      ((preventivas.find((p) => p.nome === "OK")?.quantidade || 0) /
                        preventivas.reduce((acc, p) => acc + p.quantidade, 0)) *
                        100,
                    )
                  : 0}
                %
              </div>
              <div className="text-sm text-muted-foreground mt-2">Taxa de disponibilidade</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preventivas Percentual */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Preventivas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl font-bold" style={{ color: COLORS.green }}>
                {preventivas.find((p) => p.nome === "OK")?.percentual || 0}%
              </div>
              <div className="text-sm text-muted-foreground mt-2">Eqtos com preventivas concluídas</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Execução Preventivas */}
      <Card className="border-border shadow-sm md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Execução - Preventivas</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={preventivas} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="nome" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 13 }} />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Bar dataKey="quantidade" radius={[4, 4, 0, 0]}>
                <LabelList
                  dataKey="quantidade"
                  position="top"
                  style={{ fill: "hsl(var(--foreground))", fontSize: 16, fontWeight: "bold" }}
                />
                {preventivas.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.nome === "OK" ? COLORS.green : entry.nome === "Em Planejamento" ? COLORS.yellow : COLORS.red
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-6 flex justify-around text-center border-t border-border pt-4">
            {preventivas.map((item) => (
              <div key={item.nome}>
                <div className="text-sm text-muted-foreground mb-1">{item.nome}</div>
                <div className="text-2xl font-bold">{item.quantidade}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
