"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Cell, Label, Pie, PieChart } from "recharts"
import { Info, Loader2 } from "lucide-react"

// Origens consideradas "estoque estratégico" (comparação case-insensitive por prefixo)
const PREFIXO_ORIGEM_ESTRATEGICA = "estoque estratégico"

const CORES_EQUIP = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]
const COR_OUTROS = "var(--muted-foreground)"

interface ConsumoItem {
  codigo: string
  descricao: string
  total: number
}

interface EquipItem {
  name: string
  value: number
  fill: string
}

export function EstoqueEstrategicoGraficos() {
  const [loading, setLoading] = useState(true)
  const [consumo, setConsumo] = useState<ConsumoItem[]>([])
  const [totalItensConsumo, setTotalItensConsumo] = useState(0)
  const [equipamentos, setEquipamentos] = useState<EquipItem[]>([])
  const [totalPecas, setTotalPecas] = useState(0)
  const [totalEquipamentos, setTotalEquipamentos] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        // Mapa NF -> origem (a partir das entradas)
        const { data: entradas } = await supabase
          .from("estoque_pecas")
          .select("nota_fiscal, origem")
        const mapaOrigem = new Map<string, string>()
        for (const e of entradas || []) {
          if (e.nota_fiscal && e.origem && !mapaOrigem.has(e.nota_fiscal)) {
            mapaOrigem.set(e.nota_fiscal, e.origem)
          }
        }

        // Todas as saídas
        const { data: saidas } = await supabase
          .from("saida_pecas")
          .select("codigo, descricao, quantidade, compressor, nota_fiscal")

        // Apenas saídas cuja NF deu entrada como estoque estratégico
        const estrategicas = (saidas || []).filter((s) => {
          const origem = (mapaOrigem.get(s.nota_fiscal) || "").toLowerCase()
          return origem.startsWith(PREFIXO_ORIGEM_ESTRATEGICA)
        })

        // Consumo por item
        const mapaConsumo = new Map<string, ConsumoItem>()
        // Utilização por equipamento
        const mapaEquip = new Map<string, number>()
        let somaPecas = 0

        for (const s of estrategicas) {
          const qtd = s.quantidade || 0
          somaPecas += qtd

          const atual = mapaConsumo.get(s.codigo)
          if (atual) {
            atual.total += qtd
          } else {
            mapaConsumo.set(s.codigo, { codigo: s.codigo, descricao: s.descricao || s.codigo, total: qtd })
          }

          const equip = s.compressor?.trim() || "Não informado"
          mapaEquip.set(equip, (mapaEquip.get(equip) || 0) + qtd)
        }

        const listaConsumo = [...mapaConsumo.values()].sort((a, b) => b.total - a.total)
        setTotalItensConsumo(listaConsumo.length)
        setConsumo(listaConsumo.slice(0, 10))

        const listaEquip = [...mapaEquip.entries()].sort((a, b) => b[1] - a[1])
        setTotalEquipamentos(listaEquip.length)
        setTotalPecas(somaPecas)

        // Top 5 equipamentos + agrupamento "Outros"
        const top = listaEquip.slice(0, 5)
        const resto = listaEquip.slice(5)
        const equipData: EquipItem[] = top.map(([name, value], i) => ({
          name,
          value,
          fill: CORES_EQUIP[i % CORES_EQUIP.length],
        }))
        if (resto.length > 0) {
          const somaResto = resto.reduce((acc, [, v]) => acc + v, 0)
          equipData.push({ name: "Outros equipamentos", value: somaResto, fill: COR_OUTROS })
        }
        setEquipamentos(equipData)
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const maxConsumo = useMemo(() => Math.max(1, ...consumo.map((c) => c.total)), [consumo])

  const pct = (v: number) => (totalPecas > 0 ? Math.round((v / totalPecas) * 100) : 0)

  if (loading) {
    return (
      <Card>
        <CardContent className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Consumo dos Itens Estratégicos (Top 10) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Consumo dos Itens Estratégicos (Top 10)
            <Info className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {consumo.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma saída de item com origem estratégica registrada.
            </p>
          ) : (
            <>
              <ul className="flex flex-col gap-3">
                {consumo.map((item) => (
                  <li key={item.codigo} className="flex items-center gap-3">
                    <span className="w-44 shrink-0 truncate text-sm" title={item.descricao}>
                      {item.descricao}
                    </span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-[var(--chart-1)]"
                        style={{ width: `${(item.total / maxConsumo) * 100}%` }}
                      />
                    </div>
                    <span className="w-12 shrink-0 text-right text-sm font-medium tabular-nums">
                      {item.total} un
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
                Exibindo top {consumo.length} de {totalItensConsumo} itens
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Utilização por Equipamento (Top 10) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Utilização por Equipamento (Top 10)
            <Info className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {equipamentos.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma saída de item com origem estratégica registrada.
            </p>
          ) : (
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <ChartContainer
                config={{ value: { label: "Peças" } }}
                className="mx-auto aspect-square h-[180px] w-[180px] shrink-0"
              >
                <PieChart>
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Pie data={equipamentos} dataKey="value" nameKey="name" innerRadius={55} strokeWidth={4}>
                    {equipamentos.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                              <tspan
                                x={viewBox.cx}
                                y={viewBox.cy}
                                className="fill-foreground text-2xl font-bold"
                              >
                                {totalPecas}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 20}
                                className="fill-muted-foreground text-xs"
                              >
                                Peças
                              </tspan>
                            </text>
                          )
                        }
                        return null
                      }}
                    />
                  </Pie>
                </PieChart>
              </ChartContainer>

              <ul className="flex w-full flex-col gap-2.5">
                {equipamentos.map((entry) => (
                  <li key={entry.name} className="flex items-center gap-2 text-sm">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: entry.fill }}
                      aria-hidden="true"
                    />
                    <span className="flex-1 truncate" title={entry.name}>
                      {entry.name}
                    </span>
                    <span className="shrink-0 text-muted-foreground tabular-nums">
                      {pct(entry.value)}% ({entry.value} un)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {totalEquipamentos > 0 && (
            <p className="mt-4 border-t pt-3 text-xs text-primary">
              {totalEquipamentos} equipamento{totalEquipamentos > 1 ? "s" : ""} no total
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
