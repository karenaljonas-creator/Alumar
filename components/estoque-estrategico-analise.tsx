"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Cell, Label, Pie, PieChart } from "recharts"
import { Loader2, PackageX, ShoppingCart, Wrench } from "lucide-react"

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

// Item vindo do componente pai (Lista Mestre + saldo calculado)
export interface ItemReposicao {
  codigo: string
  descricao: string
  saldo: number
  quantidade_minima: number | null
  diferenca: number | null
  status: "OK" | "Repor" | "Analisar"
}

interface ItemSemUso {
  codigo: string
  descricao: string
  dataEntrada: string | null
  diasSemUso: number
}

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

function calcularDias(data: string | null): number {
  if (!data) return 0
  const d = new Date(data)
  if (Number.isNaN(d.getTime())) return 0
  const diff = Date.now() - d.getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

const LIMITE = 5

export function EstoqueEstrategicoAnalise({ itens }: { itens: ItemReposicao[] }) {
  const [loading, setLoading] = useState(true)
  const [semUso, setSemUso] = useState<ItemSemUso[]>([])
  const [consumo, setConsumo] = useState<ConsumoItem[]>([])
  const [totalItensConsumo, setTotalItensConsumo] = useState(0)
  const [equipamentos, setEquipamentos] = useState<EquipItem[]>([])
  const [totalPecas, setTotalPecas] = useState(0)
  const [osAtendidas, setOsAtendidas] = useState(0)
  const [taxaUtilizacao, setTaxaUtilizacao] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data: entradas } = await supabase
          .from("estoque_pecas")
          .select("codigo, descricao, origem, data_emissao, nota_fiscal")
        const { data: saidas } = await supabase
          .from("saida_pecas")
          .select("codigo, descricao, quantidade, compressor, ordem_servico, nota_fiscal")

        // NF -> origem
        const mapaOrigem = new Map<string, string>()
        for (const e of entradas || []) {
          if (e.nota_fiscal && e.origem && !mapaOrigem.has(e.nota_fiscal)) {
            mapaOrigem.set(e.nota_fiscal, e.origem)
          }
        }

        const ehEstrategica = (origem?: string | null) =>
          (origem || "").toLowerCase().startsWith(PREFIXO_ORIGEM_ESTRATEGICA)

        // Entradas estratégicas por código (data de entrada mais antiga)
        const entradasEstrategicas = (entradas || []).filter((e) => ehEstrategica(e.origem))
        const codigosEstrategicos = new Set<string>()
        const mapaEntrada = new Map<string, ItemSemUso>()
        for (const e of entradasEstrategicas) {
          codigosEstrategicos.add(e.codigo)
          const existente = mapaEntrada.get(e.codigo)
          if (existente) {
            if (!existente.descricao && e.descricao) existente.descricao = e.descricao
            if (e.data_emissao && (!existente.dataEntrada || e.data_emissao < existente.dataEntrada)) {
              existente.dataEntrada = e.data_emissao
            }
          } else {
            mapaEntrada.set(e.codigo, {
              codigo: e.codigo,
              descricao: e.descricao || "",
              dataEntrada: e.data_emissao || null,
              diasSemUso: 0,
            })
          }
        }

        // Saídas estratégicas (NF deu entrada como estratégica)
        const saidasEstrategicas = (saidas || []).filter((s) => ehEstrategica(mapaOrigem.get(s.nota_fiscal)))
        const codigosComSaida = new Set<string>((saidas || []).map((s) => s.codigo))

        // --- Coluna 2: itens sem utilização ---
        const listaSemUso: ItemSemUso[] = [...mapaEntrada.values()]
          .filter((item) => !codigosComSaida.has(item.codigo))
          .map((item) => ({ ...item, diasSemUso: calcularDias(item.dataEntrada) }))
          .sort((a, b) => b.diasSemUso - a.diasSemUso || a.codigo.localeCompare(b.codigo))
        setSemUso(listaSemUso)

        // --- Coluna 3: utilização ---
        const mapaConsumo = new Map<string, ConsumoItem>()
        const mapaEquip = new Map<string, number>()
        const osSet = new Set<string>()
        let somaPecas = 0
        for (const s of saidasEstrategicas) {
          const qtd = s.quantidade || 0
          somaPecas += qtd
          if (s.ordem_servico) osSet.add(s.ordem_servico)

          const atual = mapaConsumo.get(s.codigo)
          if (atual) atual.total += qtd
          else mapaConsumo.set(s.codigo, { codigo: s.codigo, descricao: s.descricao || s.codigo, total: qtd })

          const equip = s.compressor?.trim() || "Não informado"
          mapaEquip.set(equip, (mapaEquip.get(equip) || 0) + qtd)
        }

        const listaConsumo = [...mapaConsumo.values()].sort((a, b) => b.total - a.total)
        setTotalItensConsumo(listaConsumo.length)
        setConsumo(listaConsumo.slice(0, 10))
        setTotalPecas(somaPecas)
        setOsAtendidas(osSet.size)

        // Taxa de utilização = itens estratégicos utilizados / total de itens estratégicos
        const totalEstrategicos = codigosEstrategicos.size
        const utilizados = [...codigosEstrategicos].filter((c) => codigosComSaida.has(c)).length
        setTaxaUtilizacao(totalEstrategicos > 0 ? Math.round((utilizados / totalEstrategicos) * 100) : 0)

        // Donut equipamentos (top 5 + Outros)
        const listaEquip = [...mapaEquip.entries()].sort((a, b) => b[1] - a[1])
        const top = listaEquip.slice(0, 5)
        const resto = listaEquip.slice(5)
        const equipData: EquipItem[] = top.map(([name, value], i) => ({
          name,
          value,
          fill: CORES_EQUIP[i % CORES_EQUIP.length],
        }))
        if (resto.length > 0) {
          equipData.push({ name: "Outros", value: resto.reduce((acc, [, v]) => acc + v, 0), fill: COR_OUTROS })
        }
        setEquipamentos(equipData)
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- Coluna 1: reposição (derivada dos itens recebidos) ---
  const reposicao = useMemo(() => {
    const abaixo = itens.filter((i) => i.diferenca != null && i.diferenca < 0)
    const criticos = itens.filter((i) => i.quantidade_minima != null && i.saldo <= 0)
    const impactoAlto = abaixo.filter((i) => (i.diferenca as number) <= -3)
    const totalRepor = abaixo.reduce((acc, i) => acc + Math.abs(i.diferenca as number), 0)
    const top = [...abaixo]
      .sort((a, b) => (a.diferenca as number) - (b.diferenca as number))
      .slice(0, 10)
    return {
      criticos: criticos.length,
      abaixo: abaixo.length,
      totalRepor,
      impactoAlto: impactoAlto.length,
      top,
    }
  }, [itens])

  const pct = (v: number) => (totalPecas > 0 ? Math.round((v / totalPecas) * 100) : 0)
  const maxConsumo = useMemo(() => Math.max(1, ...consumo.map((c) => c.total)), [consumo])

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
    <div className="grid gap-4 xl:grid-cols-3">
      {/* Coluna 1 — Reposição do Estoque */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="h-4 w-4 text-primary" /> 1. Reposição do Estoque
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium">Top 10 Itens para Reposição</p>
            {reposicao.top.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum item abaixo do mínimo.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-2 font-medium">#</th>
                      <th className="py-2 pr-2 font-medium">Código (PN)</th>
                      <th className="py-2 pr-2 font-medium">Descrição</th>
                      <th className="py-2 pr-2 text-center font-medium">Saldo</th>
                      <th className="py-2 pr-2 text-center font-medium">Mín.</th>
                      <th className="py-2 pr-2 text-center font-medium">Dif.</th>
                      <th className="py-2 text-center font-medium">Sugerida</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reposicao.top.map((item, idx) => (
                      <tr key={item.codigo} className="border-b last:border-0">
                        <td className="py-2 pr-2 text-muted-foreground">{idx + 1}</td>
                        <td className="py-2 pr-2 font-mono text-primary">{item.codigo}</td>
                        <td className="max-w-[160px] truncate py-2 pr-2" title={item.descricao}>
                          {item.descricao}
                        </td>
                        <td className="py-2 pr-2 text-center">{item.saldo}</td>
                        <td className="py-2 pr-2 text-center">{item.quantidade_minima ?? "-"}</td>
                        <td className="py-2 pr-2 text-center font-medium text-destructive">{item.diferenca}</td>
                        <td className="py-2 text-center font-medium">{Math.abs(item.diferenca as number)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {reposicao.abaixo > 0 && (
              <p className="mt-3 border-t pt-3 text-sm font-medium text-primary">
                Ver todos os {reposicao.abaixo} itens abaixo do mínimo →
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Coluna 2 — Itens sem Utilização */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PackageX className="h-4 w-4 text-primary" /> 2. Itens sem Utilização{" "}
            <span className="text-sm font-normal text-muted-foreground">(desde a entrada)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {semUso.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Todos os itens estratégicos já foram utilizados ao menos uma vez.
            </p>
          ) : (
            <>
              <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                {semUso.length} itens nunca foram utilizados desde a entrada no estoque.
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-2 font-medium">Código (PN)</th>
                      <th className="py-2 pr-2 font-medium">Descrição</th>
                      <th className="py-2 pr-2 text-center font-medium">Entrada Estratégica</th>
                      <th className="py-2 pr-2 text-center font-medium">Utilizado pela última vez</th>
                      <th className="py-2 text-center font-medium">Dias sem utilização</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(semUso.slice(0, LIMITE)).map((item) => (
                      <tr key={item.codigo} className="border-b last:border-0">
                        <td className="py-2 pr-2 font-mono text-primary">{item.codigo}</td>
                        <td className="max-w-[180px] truncate py-2 pr-2" title={item.descricao}>
                          {item.descricao || "-"}
                        </td>
                        <td className="py-2 pr-2 text-center">Sim</td>
                        <td className="py-2 pr-2 text-center text-muted-foreground">Nunca</td>
                        <td className="py-2 text-center font-medium">{item.diasSemUso}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 border-t pt-3 text-sm font-medium text-primary">
                Ver todos os {semUso.length} itens sem utilização →
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Coluna 3 — Utilização dos Itens Estratégicos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wrench className="h-4 w-4 text-primary" /> 3. Utilização dos Itens Estratégicos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2">
            <MiniKpi label="Peças consumidas" value={totalPecas} tone="primary" />
            <MiniKpi label="OS atendidas" value={osAtendidas} tone="primary" />
            <MiniKpi label="Itens sem utilização" value={semUso.length} tone="primary" />
            <MiniKpi label="Taxa de utilização" value={`${taxaUtilizacao}%`} tone="primary" />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Top 10 Itens mais consumidos</p>
            {consumo.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhuma saída de item estratégico registrada.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {consumo.map((item, idx) => (
                  <li key={item.codigo} className="flex items-center gap-2 text-sm">
                    <span className="w-5 shrink-0 text-muted-foreground tabular-nums">{idx + 1}</span>
                    <span className="flex-1 truncate" title={item.descricao}>
                      {item.descricao}
                    </span>
                    <div className="h-2 w-16 shrink-0 overflow-hidden rounded-full bg-muted sm:w-20">
                      <div
                        className="h-full rounded-full bg-[var(--chart-1)]"
                        style={{ width: `${(item.total / maxConsumo) * 100}%` }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right font-medium tabular-nums">{item.total} un</span>
                  </li>
                ))}
              </ul>
            )}
            {totalItensConsumo > 0 && (
              <p className="mt-3 border-t pt-3 text-sm font-medium text-primary">
                Ver todos os {totalItensConsumo} itens consumidos →
              </p>
            )}
          </div>

          {equipamentos.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">Utilização por Equipamento (Top 5)</p>
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <ChartContainer
                  config={{ value: { label: "Peças" } }}
                  className="mx-auto aspect-square h-[150px] w-[150px] shrink-0"
                >
                  <PieChart>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                    <Pie data={equipamentos} dataKey="value" nameKey="name" innerRadius={45} strokeWidth={4}>
                      {equipamentos.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                      <Label
                        content={({ viewBox }) => {
                          if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                            return (
                              <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-xl font-bold">
                                  {totalPecas}
                                </tspan>
                                <tspan
                                  x={viewBox.cx}
                                  y={(viewBox.cy || 0) + 18}
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

                <ul className="flex w-full flex-col gap-2 text-sm">
                  {equipamentos.map((entry) => (
                    <li key={entry.name} className="flex items-center gap-2">
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function MiniKpi({
  label,
  value,
  tone,
}: {
  label: string
  value: number | string
  tone: "default" | "primary" | "danger" | "warning"
}) {
  const cor =
    tone === "danger"
      ? "text-destructive"
      : tone === "warning"
        ? "text-amber-600 dark:text-amber-500"
        : "text-primary"
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <p className={`text-2xl font-bold ${cor}`}>{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
