"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import {
  Search,
  History,
  Loader2,
  ArrowDownCircle,
  ArrowUpCircle,
  PackageCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
} from "lucide-react"

type Status = "OK" | "Repor" | "Analisar"
type Criticidade = "Crítico" | "Atenção" | "Normal"

interface Movimento {
  tipo: "ENTRADA" | "SAIDA"
  data: string | null
  quantidade: number
  notaFiscal?: string | null
  origem?: string | null
  numeroSerie?: string | null
  ordemServico?: string | null
  equipamento?: string | null
  utilizacao?: string | null
  area?: string | null
  observacao?: string | null
}

interface HistoricoItem {
  codigo: string
  descricao: string
  qtdInicial: number
  consumido: number
  saldoAtual: number
  quantidadeMinima: number | null
  ultimaUtilizacao: string | null
  osAtendidas: number
  equipamentos: string[]
  status: Status
  criticidade: Criticidade
  naListaMestre: boolean
  movimentos: Movimento[]
}

function classificarCriticidade(saldo: number, minima: number | null): Criticidade {
  if (minima === null) {
    return saldo <= 0 ? "Crítico" : "Normal"
  }
  if (saldo >= minima) return "Normal"
  if (saldo <= 0 || saldo < minima * 0.5) return "Crítico"
  return "Atenção"
}

function formatarData(iso: string | null): string {
  if (!iso) return "–"
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""))
  if (isNaN(d.getTime())) return "–"
  return d.toLocaleDateString("pt-BR")
}

function formatarDataHora(iso: string | null): string {
  if (!iso) return "–"
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""))
  if (isNaN(d.getTime())) return "–"
  return d.toLocaleDateString("pt-BR")
}

const OPCOES_POR_PAGINA = [10, 20, 50, 100]

export function HistoricoUtilizacaoEstrategico() {
  const [itens, setItens] = useState<HistoricoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filtroStatus, setFiltroStatus] = useState<string>("todos")
  const [filtroCriticidade, setFiltroCriticidade] = useState<string>("todas")
  const [filtroEquipamento, setFiltroEquipamento] = useState<string>("todos")
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(20)
  const [selecionado, setSelecionado] = useState<HistoricoItem | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadDados()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadDados = async () => {
    setLoading(true)
    try {
      const [entradasRes, saidasRes, mestreRes] = await Promise.all([
        supabase
          .from("estoque_pecas")
          .select("codigo, descricao, quantidade, origem, nota_fiscal, numero_serie, data_emissao"),
        supabase
          .from("saida_pecas")
          .select("codigo, descricao, quantidade, data_saida, ordem_servico, compressor, utilizacao, area, observacao"),
        supabase.from("lista_mestre").select("codigo, descricao, quantidade_minima"),
      ])

      const entradas = entradasRes.data || []
      const saidas = saidasRes.data || []
      const mestre = mestreRes.data || []

      const mapaMestre = new Map<string, { descricao: string; quantidade_minima: number }>()
      for (const m of mestre) {
        mapaMestre.set(m.codigo, { descricao: m.descricao, quantidade_minima: m.quantidade_minima })
      }

      // Agrupar movimentos por código (todos os itens, sem restrição de lista/origem)
      const entradasPorCodigo = new Map<string, typeof entradas>()
      for (const e of entradas) {
        const arr = entradasPorCodigo.get(e.codigo) || []
        arr.push(e)
        entradasPorCodigo.set(e.codigo, arr)
      }
      const saidasPorCodigo = new Map<string, typeof saidas>()
      for (const s of saidas) {
        const arr = saidasPorCodigo.get(s.codigo) || []
        arr.push(s)
        saidasPorCodigo.set(s.codigo, arr)
      }

      // Todos os códigos que aparecem em qualquer movimento ou na Lista Mestre.
      const todosCodigos = new Set<string>([
        ...mapaMestre.keys(),
        ...entradasPorCodigo.keys(),
        ...saidasPorCodigo.keys(),
      ])

      const linhas: HistoricoItem[] = []
      for (const codigo of todosCodigos) {
        const es = entradasPorCodigo.get(codigo) || []
        const ss = saidasPorCodigo.get(codigo) || []
        const mestreInfo = mapaMestre.get(codigo)

        // Histórico geral: inclui qualquer item que teve movimentação (entrada ou saída).
        if (es.length === 0 && ss.length === 0) continue

        const qtdInicial = es.reduce((acc, e) => acc + (e.quantidade || 0), 0)
        const consumido = ss.reduce((acc, s) => acc + (s.quantidade || 0), 0)
        const saldoAtual = qtdInicial - consumido
        const quantidadeMinima = mestreInfo?.quantidade_minima ?? null

        // Última utilização = data de saída mais recente
        let ultimaUtilizacao: string | null = null
        for (const s of ss) {
          if (s.data_saida && (!ultimaUtilizacao || s.data_saida > ultimaUtilizacao)) {
            ultimaUtilizacao = s.data_saida
          }
        }

        // OS atendidas (distintas, não vazias)
        const setOS = new Set<string>()
        for (const s of ss) {
          if (s.ordem_servico && s.ordem_servico.trim()) setOS.add(s.ordem_servico.trim())
        }

        // Equipamentos distintos
        const setEquip = new Set<string>()
        for (const s of ss) {
          if (s.compressor && s.compressor.trim()) setEquip.add(s.compressor.trim())
        }

        // Descrição preferindo Lista Mestre, depois entradas, depois saídas
        const descricao =
          mestreInfo?.descricao || es[0]?.descricao || ss[0]?.descricao || ""

        // Linha do tempo (entradas + saídas) ordenada por data descendente (mais novo primeiro)
        const movimentos: Movimento[] = [
          ...es.map((e) => ({
            tipo: "ENTRADA" as const,
            data: e.data_emissao,
            quantidade: e.quantidade || 0,
            notaFiscal: e.nota_fiscal,
            origem: e.origem,
            numeroSerie: e.numero_serie,
          })),
          ...ss.map((s) => ({
            tipo: "SAIDA" as const,
            data: s.data_saida,
            quantidade: s.quantidade || 0,
            ordemServico: s.ordem_servico,
            equipamento: s.compressor,
            utilizacao: s.utilizacao,
            area: s.area,
            observacao: s.observacao,
          })),
        ].sort((a, b) => {
          const da = a.data || ""
          const db = b.data || ""
          return db.localeCompare(da)
        })

        const status: Status = mestreInfo
          ? saldoAtual >= mestreInfo.quantidade_minima
            ? "OK"
            : "Repor"
          : "Analisar"

        linhas.push({
          codigo,
          descricao,
          qtdInicial,
          consumido,
          saldoAtual,
          quantidadeMinima,
          ultimaUtilizacao,
          osAtendidas: setOS.size,
          equipamentos: Array.from(setEquip),
          status,
          criticidade: classificarCriticidade(saldoAtual, quantidadeMinima),
          naListaMestre: !!mestreInfo,
          movimentos,
        })
      }

      // Ordena por consumo (mais utilizados primeiro), depois por código
      linhas.sort((a, b) => b.consumido - a.consumido || a.codigo.localeCompare(b.codigo))
      setItens(linhas)
    } catch (err) {
      toast({ title: "Erro ao carregar histórico de utilização", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  // Universo de equipamentos para o filtro
  const equipamentosDisponiveis = useMemo(() => {
    const set = new Set<string>()
    for (const i of itens) for (const eq of i.equipamentos) set.add(eq)
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"))
  }, [itens])

  const itensFiltrados = useMemo(() => {
    const termo = searchTerm.trim().toLowerCase()
    return itens.filter((i) => {
      if (filtroStatus !== "todos" && i.status !== filtroStatus) return false
      if (filtroCriticidade !== "todas" && i.criticidade !== filtroCriticidade) return false
      if (filtroEquipamento !== "todos" && !i.equipamentos.includes(filtroEquipamento)) return false
      if (termo) {
        const alvo = [
          i.codigo,
          i.descricao,
          ...i.equipamentos,
          ...i.movimentos.map((m) => m.ordemServico || ""),
        ]
          .join(" ")
          .toLowerCase()
        if (!alvo.includes(termo)) return false
      }
      return true
    })
  }, [itens, searchTerm, filtroStatus, filtroCriticidade, filtroEquipamento])

  // Reseta a paginação quando os filtros mudam
  useEffect(() => {
    setPagina(1)
  }, [searchTerm, filtroStatus, filtroCriticidade, filtroEquipamento, porPagina])

  const totalPaginas = Math.max(1, Math.ceil(itensFiltrados.length / porPagina))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const inicio = (paginaAtual - 1) * porPagina
  const itensPagina = itensFiltrados.slice(inicio, inicio + porPagina)

  const filtrosAtivos =
    searchTerm.trim() !== "" ||
    filtroStatus !== "todos" ||
    filtroCriticidade !== "todas" ||
    filtroEquipamento !== "todos"

  const limparFiltros = () => {
    setSearchTerm("")
    setFiltroStatus("todos")
    setFiltroCriticidade("todas")
    setFiltroEquipamento("todos")
  }

  const CriticidadeBadge = ({ c }: { c: Criticidade }) => {
    if (c === "Crítico") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Crítico
        </span>
      )
    }
    if (c === "Atenção") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-600">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Atenção
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-600">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Normal
      </span>
    )
  }

  // Números de página a exibir (janela de até 3)
  const paginasVisiveis = useMemo(() => {
    const paginas: number[] = []
    const max = Math.min(totalPaginas, 3)
    let start = Math.max(1, paginaAtual - 1)
    if (start + max - 1 > totalPaginas) start = Math.max(1, totalPaginas - max + 1)
    for (let i = 0; i < max; i++) paginas.push(start + i)
    return paginas
  }, [totalPaginas, paginaAtual])

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-5 w-5" /> Histórico de Utilização dos Itens
          </CardTitle>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="OK">OK</SelectItem>
                  <SelectItem value="Repor">Repor</SelectItem>
                  <SelectItem value="Analisar">Analisar</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filtroCriticidade} onValueChange={setFiltroCriticidade}>
                <SelectTrigger className="w-[190px]">
                  <SelectValue placeholder="Todas as classificações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as classificações</SelectItem>
                  <SelectItem value="Crítico">Crítico</SelectItem>
                  <SelectItem value="Atenção">Atenção</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filtroEquipamento} onValueChange={setFiltroEquipamento}>
                <SelectTrigger className="w-[190px]">
                  <SelectValue placeholder="Todos os equipamentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os equipamentos</SelectItem>
                  {equipamentosDisponiveis.map((eq) => (
                    <SelectItem key={eq} value={eq}>
                      {eq}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {filtrosAtivos && (
                <Button variant="ghost" size="sm" onClick={limparFiltros} className="gap-1 text-muted-foreground">
                  <X className="h-3.5 w-3.5" /> Limpar
                </Button>
              )}
            </div>

            <div className="relative w-full lg:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, descrição, OS ou equipamento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando histórico...
          </div>
        ) : itensFiltrados.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            {filtrosAtivos ? "Nenhum item encontrado com os filtros atuais." : "Nenhum item estratégico registrado."}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código (PN)</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-center">Qtd. Inicial</TableHead>
                    <TableHead className="text-center">Consumido</TableHead>
                    <TableHead className="text-center">Saldo Atual</TableHead>
                    <TableHead className="text-center">Qtd. Mínima</TableHead>
                    <TableHead>Última Utilização</TableHead>
                    <TableHead className="text-center">OS Atendidas</TableHead>
                    <TableHead>Equipamentos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itensPagina.map((item) => (
                    <TableRow
                      key={item.codigo}
                      className="cursor-pointer"
                      onClick={() => setSelecionado(item)}
                    >
                      <TableCell className="font-mono font-medium text-primary">{item.codigo}</TableCell>
                      <TableCell className="max-w-[220px] truncate">{item.descricao || "-"}</TableCell>
                      <TableCell className="text-center">{item.qtdInicial}</TableCell>
                      <TableCell className="text-center font-medium">{item.consumido}</TableCell>
                      <TableCell className="text-center">
                        <span className={item.saldoAtual <= 0 ? "font-semibold text-red-600" : "font-semibold"}>
                          {item.saldoAtual}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">{item.quantidadeMinima ?? "-"}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatarData(item.ultimaUtilizacao)}</TableCell>
                      <TableCell className="text-center">{item.osAtendidas}</TableCell>
                      <TableCell className="max-w-[160px] truncate">
                        {item.equipamentos.length > 0 ? item.equipamentos.join(", ") : "–"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Paginação */}
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Mostrando {itensFiltrados.length === 0 ? 0 : inicio + 1} a{" "}
                {Math.min(inicio + porPagina, itensFiltrados.length)} de {itensFiltrados.length} itens
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Itens por página:</span>
                  <Select value={String(porPagina)} onValueChange={(v) => setPorPagina(Number(v))}>
                    <SelectTrigger className="w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPCOES_POR_PAGINA.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                    disabled={paginaAtual <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {paginasVisiveis.map((p) => (
                    <Button
                      key={p}
                      variant={p === paginaAtual ? "default" : "outline"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPagina(p)}
                    >
                      {p}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                    disabled={paginaAtual >= totalPaginas}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>

      {/* Painel lateral: Linha do Tempo do item */}
      <Sheet open={!!selecionado} onOpenChange={(open) => !open && setSelecionado(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selecionado && (
            <>
              <SheetHeader className="space-y-1 text-left">
                <SheetDescription className="text-xs uppercase tracking-wide">
                  Detalhe do Item Selecionado
                </SheetDescription>
                <SheetTitle className="flex items-center justify-between gap-3">
                  <span className="font-mono text-lg">
                    {selecionado.codigo}
                  </span>
                  <CriticidadeBadge c={selecionado.criticidade} />
                </SheetTitle>
                <p className="text-sm text-muted-foreground">{selecionado.descricao || "Sem descrição"}</p>
              </SheetHeader>

              {/* Resumo */}
              <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border p-3 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Qtd. Inicial</p>
                  <p className="text-lg font-bold">{selecionado.qtdInicial}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Consumido</p>
                  <p className="text-lg font-bold">{selecionado.consumido}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo Atual</p>
                  <p className={`text-lg font-bold ${selecionado.saldoAtual <= 0 ? "text-red-600" : ""}`}>
                    {selecionado.saldoAtual}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Qtd. Mínima</p>
                  <p className="text-lg font-bold">{selecionado.quantidadeMinima ?? "–"}</p>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Linha do tempo */}
              <h3 className="mb-3 text-sm font-semibold">Linha do Tempo</h3>
              {selecionado.movimentos.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhuma movimentação registrada para este item.
                </p>
              ) : (
                <ol className="relative space-y-5 border-l border-border pl-6">
                  {selecionado.movimentos.map((m, idx) => (
                    <li key={idx} className="relative">
                      <span
                        className={`absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full ${
                          m.tipo === "ENTRADA" ? "bg-emerald-100" : "bg-sky-100"
                        }`}
                      >
                        {m.tipo === "ENTRADA" ? (
                          <ArrowDownCircle className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <ArrowUpCircle className="h-4 w-4 text-sky-600" />
                        )}
                      </span>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">{formatarDataHora(m.data)}</p>
                          <p
                            className={`text-sm font-bold ${
                              m.tipo === "ENTRADA" ? "text-emerald-700" : "text-sky-700"
                            }`}
                          >
                            {m.tipo === "ENTRADA" ? "ENTRADA" : "SAÍDA"}
                          </p>
                          {m.tipo === "ENTRADA" ? (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {m.notaFiscal ? `NF: ${m.notaFiscal}` : "Sem NF"}
                              {m.origem ? `  |  Origem: ${m.origem}` : ""}
                              {m.numeroSerie ? `  |  Série: ${m.numeroSerie}` : ""}
                            </p>
                          ) : (
                            <div className="mt-0.5 space-y-0.5 text-xs text-muted-foreground">
                              <p>
                                {m.ordemServico ? `OS: ${m.ordemServico}` : "Sem OS"}
                                {m.equipamento ? `  |  Equipamento: ${m.equipamento}` : ""}
                              </p>
                              {(m.utilizacao || m.area) && (
                                <p>
                                  {m.utilizacao ? `Tipo: ${m.utilizacao}` : ""}
                                  {m.area ? `  |  Aplicação: ${m.area}` : ""}
                                </p>
                              )}
                              {m.observacao && <p className="italic">{m.observacao}</p>}
                            </div>
                          )}
                        </div>
                        <span
                          className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${
                            m.tipo === "ENTRADA"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {m.tipo === "ENTRADA" ? `+${m.quantidade}` : `-${m.quantidade}`} un
                        </span>
                      </div>
                    </li>
                  ))}
                  {/* Saldo final */}
                  <li className="relative">
                    <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                      <PackageCheck className="h-4 w-4 text-primary" />
                    </span>
                    <p className="text-sm font-semibold">Saldo Atual</p>
                    <p className="text-xs text-muted-foreground">
                      {selecionado.saldoAtual} {selecionado.saldoAtual === 1 ? "disponível" : "disponíveis"} em estoque
                    </p>
                  </li>
                </ol>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </Card>
  )
}

export default HistoricoUtilizacaoEstrategico
