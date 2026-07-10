"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  Plus,
  Search,
  Edit,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Package,
  ArrowDown,
  FileText,
} from "lucide-react"
import { ColumnFilter, type SortDir } from "@/components/column-filter"
import { EstoqueEstrategicoAnalise } from "@/components/estoque-estrategico-analise"
import { gerarRelatorioEstrategico } from "@/lib/gerar-relatorio-estrategico"

type Status = "OK" | "Repor" | "Analisar"

// Colunas filtráveis/ordenáveis da tabela
type ColKey = "codigo" | "descricao" | "saldo" | "quantidade_minima" | "diferenca" | "status"

const COLUNAS: { key: ColKey; label: string; align: "start" | "center" }[] = [
  { key: "codigo", label: "Código (PN)", align: "start" },
  { key: "descricao", label: "Descrição", align: "start" },
  { key: "saldo", label: "Saldo", align: "center" },
  { key: "quantidade_minima", label: "Qtd. Mínima", align: "center" },
  { key: "diferenca", label: "Diferença", align: "center" },
  { key: "status", label: "Status", align: "center" },
]

const COLUNAS_NUMERICAS: ColKey[] = ["saldo", "quantidade_minima", "diferenca"]

const STORAGE_KEY = "estoque-estrategico-filtros-v1"

// Valor textual de uma coluna para um item (usado em filtro e ordenação)
function valorColuna(item: ItemEstrategico, key: ColKey): string {
  const v = item[key]
  if (v === null || v === undefined || v === "") return "-"
  return String(v)
}

interface ItemEstrategico {
  codigo: string
  descricao: string
  saldo: number
  quantidade_minima: number | null
  diferenca: number | null
  status: Status
  naListaMestre: boolean
  listaMestreId?: number
}

// Donut do percentual de itens abaixo do mínimo: arco vermelho = crítico, verde = restante
function DonutCritico({ pct }: { pct: number }) {
  const p = Math.max(0, Math.min(100, pct))
  const r = 42
  const c = 2 * Math.PI * r
  const vermelho = (p / 100) * c
  return (
    <div className="relative h-32 w-32 shrink-0" role="img" aria-label={`${p}% do estoque abaixo do mínimo`}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--secondary)" strokeWidth={12} />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={12}
          strokeDasharray={`${vermelho.toFixed(2)} ${(c - vermelho).toFixed(2)}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="rounded-full bg-primary/10 p-3">
          <ArrowDown className="h-6 w-6 text-primary" />
        </div>
      </div>
    </div>
  )
}

export function EstoqueEstrategico() {
  const [itens, setItens] = useState<ItemEstrategico[]>([])
  const [loading, setLoading] = useState(true)
  const [gerandoRelatorio, setGerandoRelatorio] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  // Filtros por coluna: chave presente = filtro ativo; array = valores permitidos
  const [filtros, setFiltros] = useState<Partial<Record<ColKey, string[]>>>({})
  // Ordenação atual
  const [ordenacao, setOrdenacao] = useState<{ key: ColKey; dir: SortDir } | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  // Dialog de edição
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<ItemEstrategico | null>(null)
  const [editForm, setEditForm] = useState({ descricao: "", quantidade_minima: 1 })
  const [salvando, setSalvando] = useState(false)

  // Dialog de novo item
  const [novoDialogOpen, setNovoDialogOpen] = useState(false)
  const [novoForm, setNovoForm] = useState({ codigo: "", descricao: "", quantidade_minima: 1 })

  const ORIGEM_ESTRATEGICA = "Estoque estratégico - corretivos"

  useEffect(() => {
    loadDados()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Restaura filtros/ordenação salvos (persistência entre telas)
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed.filtros) setFiltros(parsed.filtros)
        if (parsed.ordenacao) setOrdenacao(parsed.ordenacao)
        if (typeof parsed.searchTerm === "string") setSearchTerm(parsed.searchTerm)
      }
    } catch {
      /* ignora estado corrompido */
    }
  }, [])

  // Salva filtros/ordenação sempre que mudarem
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ filtros, ordenacao, searchTerm }))
      }
    } catch {
      /* ignora falha de armazenamento */
    }
  }, [filtros, ordenacao, searchTerm])

  // Handlers de filtro/ordenação por coluna
  const aplicarFiltroColuna = (key: ColKey, selecionados: string[] | null) => {
    setFiltros((prev) => {
      const next = { ...prev }
      if (selecionados === null) {
        delete next[key]
      } else {
        next[key] = selecionados
      }
      return next
    })
  }

  const ordenarColuna = (key: ColKey, dir: SortDir) => {
    setOrdenacao((prev) => (prev?.key === key && prev.dir === dir ? null : { key, dir }))
  }

  const loadDados = async () => {
    setLoading(true)
    try {
      // 1) TODAS as movimentações de ENTRADA (o saldo real é Entrada - Saída,
      //    igual à tela de Estoque). A origem só é usada para decidir o que aparece.
      const { data: entradas } = await supabase
        .from("estoque_pecas")
        .select("codigo, descricao, quantidade, origem")

      // 2) Movimentações de SAÍDA (todas, descontam do saldo)
      const { data: saidas } = await supabase.from("saida_pecas").select("codigo, quantidade")

      // 3) Lista Mestre (configuração de estoque mínimo)
      const { data: listaMestre } = await supabase
        .from("lista_mestre")
        .select("id, codigo, descricao, quantidade_minima")

      // Agrupar TODAS as entradas por código (saldo físico real)
      const mapaEntradas = new Map<string, { descricao: string; total: number }>()
      // Códigos que possuem AO MENOS uma entrada com origem estratégica
      // (usado para incluir PNs fora da Lista Mestre como "Analisar")
      const codigosEstrategicos = new Set<string>()
      for (const e of entradas || []) {
        const atual = mapaEntradas.get(e.codigo)
        if (atual) {
          atual.total += e.quantidade || 0
        } else {
          mapaEntradas.set(e.codigo, { descricao: e.descricao || "", total: e.quantidade || 0 })
        }
        if (e.origem === ORIGEM_ESTRATEGICA) {
          codigosEstrategicos.add(e.codigo)
        }
      }

      // Total de saídas por código
      const mapaSaidas = new Map<string, number>()
      for (const s of saidas || []) {
        mapaSaidas.set(s.codigo, (mapaSaidas.get(s.codigo) || 0) + (s.quantidade || 0))
      }

      // Lista Mestre por código
      const mapaMestre = new Map<string, { id: number; descricao: string; quantidade_minima: number }>()
      for (const m of listaMestre || []) {
        mapaMestre.set(m.codigo, { id: m.id, descricao: m.descricao, quantidade_minima: m.quantidade_minima })
      }

      // Montar a tabela com a UNIÃO de:
      //  (a) TODOS os itens da Lista Mestre (sempre visíveis), e
      //  (b) PNs com movimentação ESTRATÉGICA que NÃO estão na Lista Mestre (status Analisar).
      const todosCodigos = new Set<string>([...mapaMestre.keys(), ...codigosEstrategicos])

      const linhas: ItemEstrategico[] = []
      for (const codigo of todosCodigos) {
        const info = mapaEntradas.get(codigo)
        // Saldo físico real = total de entradas - total de saídas (todas as origens)
        const saldo = (info?.total || 0) - (mapaSaidas.get(codigo) || 0)
        const mestre = mapaMestre.get(codigo)

        if (mestre) {
          const diferenca = saldo - mestre.quantidade_minima
          linhas.push({
            codigo,
            descricao: mestre.descricao || info?.descricao || "",
            saldo,
            quantidade_minima: mestre.quantidade_minima,
            diferenca,
            status: saldo >= mestre.quantidade_minima ? "OK" : "Repor",
            naListaMestre: true,
            listaMestreId: mestre.id,
          })
        } else {
          // PN com movimentação estratégica, mas não cadastrado na Lista Mestre -> ANALISAR
          linhas.push({
            codigo,
            descricao: info?.descricao || "",
            saldo,
            quantidade_minima: null,
            diferenca: null,
            status: "Analisar",
            naListaMestre: false,
          })
        }
      }

      // Ordenar: Repor primeiro, depois Analisar, depois OK
      const ordem: Record<Status, number> = { Repor: 0, Analisar: 1, OK: 2 }
      linhas.sort((a, b) => ordem[a.status] - ordem[b.status] || a.codigo.localeCompare(b.codigo))

      setItens(linhas)
    } catch (err) {
      toast({ title: "Erro ao carregar estoque estratégico", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const abrirEdicao = (item: ItemEstrategico) => {
    setEditItem(item)
    setEditForm({
      descricao: item.descricao,
      quantidade_minima: item.quantidade_minima ?? 1,
    })
    setEditDialogOpen(true)
  }

  // Salvar edição (item já na Lista Mestre) OU incluir na Lista Mestre (item ANALISAR)
  const salvarEdicao = async () => {
    if (!editItem || salvando) return
    if (editForm.quantidade_minima < 0) {
      toast({ title: "Quantidade mínima inválida", variant: "destructive" })
      return
    }
    setSalvando(true)
    try {
      if (editItem.naListaMestre && editItem.listaMestreId) {
        const { error } = await supabase
          .from("lista_mestre")
          .update({
            descricao: editForm.descricao,
            quantidade_minima: editForm.quantidade_minima,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editItem.listaMestreId)
        if (error) throw error
        toast({ title: "Item atualizado na Lista Mestre" })
      } else {
        // Incluir na Lista Mestre
        const { error } = await supabase.from("lista_mestre").insert({
          codigo: editItem.codigo,
          descricao: editForm.descricao,
          quantidade_minima: editForm.quantidade_minima,
        })
        if (error) throw error
        toast({
          title: "Incluído na Lista Mestre!",
          description: `O PN ${editItem.codigo} agora é parametrizado pelo estoque mínimo.`,
        })
      }
      setEditDialogOpen(false)
      setEditItem(null)
      await loadDados()
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err?.message, variant: "destructive" })
    } finally {
      setSalvando(false)
    }
  }

  // Cadastrar novo item diretamente na Lista Mestre
  const salvarNovo = async () => {
    if (salvando) return
    const codigo = novoForm.codigo.trim()
    if (!codigo) {
      toast({ title: "Informe o PN (código)", variant: "destructive" })
      return
    }
    if (novoForm.quantidade_minima < 0) {
      toast({ title: "Quantidade mínima inválida", variant: "destructive" })
      return
    }
    setSalvando(true)
    try {
      const { error } = await supabase.from("lista_mestre").insert({
        codigo,
        descricao: novoForm.descricao,
        quantidade_minima: novoForm.quantidade_minima,
      })
      if (error) {
        if (error.code === "23505") {
          toast({ title: "Este PN já existe na Lista Mestre", variant: "destructive" })
        } else {
          throw error
        }
        return
      }
      toast({ title: "Item adicionado à Lista Mestre!" })
      setNovoDialogOpen(false)
      setNovoForm({ codigo: "", descricao: "", quantidade_minima: 1 })
      await loadDados()
    } catch (err: any) {
      toast({ title: "Erro ao cadastrar", description: err?.message, variant: "destructive" })
    } finally {
      setSalvando(false)
    }
  }

  // Remover da Lista Mestre (não exclui o item do sistema)
  const removerDaListaMestre = async (item: ItemEstrategico) => {
    if (!item.listaMestreId) return
    const confirmar = window.confirm(
      `Remover o PN ${item.codigo} da Lista Mestre?\n\nO item NÃO será excluído do sistema. Ele continuará aparecendo na tela com status "Analisar" até ser reclassificado.`,
    )
    if (!confirmar) return
    const { error } = await supabase.from("lista_mestre").delete().eq("id", item.listaMestreId)
    if (error) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" })
      return
    }
    toast({ title: "Removido da Lista Mestre" })
    await loadDados()
  }

  // Remover item "Analisar" do controle estratégico.
  // Troca a origem das entradas desse PN de "Estoque estratégico - corretivos" para "Analisar".
  // O item NÃO é excluído do sistema; apenas deixa de ser estratégico e, na aba Entrada,
  // sua origem passa a aparecer como "Analisar".
  const removerDaAnalise = async (item: ItemEstrategico) => {
    const confirmar = window.confirm(
      `Remover o PN ${item.codigo} do controle estratégico?\n\nO item NÃO será excluído do sistema. As entradas dele deixarão de ser estratégicas e, na aba Entrada, a Origem passará a "Analisar".`,
    )
    if (!confirmar) return
    const { error } = await supabase
      .from("estoque_pecas")
      .update({ origem: "Analisar" })
      .eq("codigo", item.codigo)
      .eq("origem", ORIGEM_ESTRATEGICA)
    if (error) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" })
      return
    }
    toast({ title: "Item removido do controle estratégico" })
    await loadDados()
  }

  // Verifica se um item passa na busca textual
  const passaBusca = (i: ItemEstrategico) => {
    const termo = searchTerm.trim().toLowerCase()
    if (!termo) return true
    return i.codigo.toLowerCase().includes(termo) || i.descricao.toLowerCase().includes(termo)
  }

  // Verifica se um item passa nos filtros de coluna (podendo ignorar uma coluna)
  const passaFiltros = (i: ItemEstrategico, exceto?: ColKey) => {
    for (const key of Object.keys(filtros) as ColKey[]) {
      if (key === exceto) continue
      const permitidos = filtros[key]
      if (!permitidos || permitidos.length === 0) continue
      if (!permitidos.includes(valorColuna(i, key))) return false
    }
    return true
  }

  // Universo estável de valores por coluna (sobre todos os itens)
  const universoPorColuna = useMemo(() => {
    const mapa = {} as Record<ColKey, string[]>
    for (const col of COLUNAS) {
      const set = new Set<string>()
      for (const i of itens) set.add(valorColuna(i, col.key))
      const arr = Array.from(set)
      if (COLUNAS_NUMERICAS.includes(col.key)) {
        arr.sort((a, b) => {
          const na = a === "-" ? Number.NEGATIVE_INFINITY : Number(a)
          const nb = b === "-" ? Number.NEGATIVE_INFINITY : Number(b)
          return na - nb
        })
      } else {
        arr.sort((a, b) => a.localeCompare(b, "pt-BR"))
      }
      mapa[col.key] = arr
    }
    return mapa
  }, [itens])

  // Auto-cura: remove dos filtros valores que não existem mais nos dados atuais.
  // Evita que a tabela trave vazia quando um valor filtrado (ex.: status "Analisar")
  // deixa de existir após o usuário tratar/excluir todos os itens daquele valor.
  useEffect(() => {
    if (itens.length === 0) return
    setFiltros((prev) => {
      let mudou = false
      const next: Partial<Record<ColKey, string[]>> = {}
      for (const key of Object.keys(prev) as ColKey[]) {
        const selecionados = prev[key]
        if (!selecionados || selecionados.length === 0) {
          mudou = true
          continue
        }
        const universo = universoPorColuna[key] ?? []
        const validos = selecionados.filter((v) => universo.includes(v))
        if (validos.length === 0) {
          // nenhum valor selecionado existe mais -> descarta o filtro
          mudou = true
          continue
        }
        if (validos.length !== selecionados.length) mudou = true
        next[key] = validos
      }
      return mudou ? next : prev
    })
  }, [itens, universoPorColuna])

  // Contagem por valor de cada coluna, considerando os DEMAIS filtros + busca
  const contagensPorColuna = useMemo(() => {
    const mapa = {} as Record<ColKey, Record<string, number>>
    for (const col of COLUNAS) {
      const contagem: Record<string, number> = {}
      for (const i of itens) {
        if (!passaBusca(i)) continue
        if (!passaFiltros(i, col.key)) continue
        const v = valorColuna(i, col.key)
        contagem[v] = (contagem[v] || 0) + 1
      }
      mapa[col.key] = contagem
    }
    return mapa
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itens, filtros, searchTerm])

  // Lista final: busca + filtros de coluna + ordenação
  const itensFiltrados = useMemo(() => {
    const filtrados = itens.filter((i) => passaBusca(i) && passaFiltros(i))
    if (ordenacao) {
      const { key, dir } = ordenacao
      const numerica = COLUNAS_NUMERICAS.includes(key)
      filtrados.sort((a, b) => {
        const va = valorColuna(a, key)
        const vb = valorColuna(b, key)
        let cmp: number
        if (numerica) {
          const na = va === "-" ? Number.NEGATIVE_INFINITY : Number(va)
          const nb = vb === "-" ? Number.NEGATIVE_INFINITY : Number(vb)
          cmp = na - nb
        } else {
          cmp = va.localeCompare(vb, "pt-BR")
        }
        return dir === "asc" ? cmp : -cmp
      })
    }
    return filtrados
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itens, filtros, searchTerm, ordenacao])

  const totalRepor = itens.filter((i) => i.status === "Repor").length
  const totalOk = itens.filter((i) => i.status === "OK").length
  const totalMonitorados = itens.length
  // Itens avaliáveis = possuem mínimo definido (Lista Mestre): OK ou Repor.
  // Os "Analisar" não têm mínimo, portanto não entram no cálculo de aderência/criticidade.
  const totalAvaliaveis = totalOk + totalRepor

  // Métricas do painel superior
  const aderenciaPct = totalAvaliaveis ? Math.round((totalOk / totalAvaliaveis) * 100) : 0
  const qtdRepor = itens.reduce(
    (acc, i) => acc + ((i.diferenca ?? 0) < 0 ? Math.abs(i.diferenca as number) : 0),
    0,
  )

  // Percentual de itens abaixo do mínimo (usado no donut do topo)
  const criticosPctTotal = totalMonitorados ? Math.round((totalRepor / totalMonitorados) * 100) : 0

  // Faixa de aderência: define cor e rótulo
  const aderenciaNivel =
    aderenciaPct >= 70 ? "bom" : aderenciaPct >= 40 ? "medio" : "baixo"
  const aderenciaCor = "text-primary"
  const aderenciaBarra = "bg-primary"
  const aderenciaRotulo = aderenciaNivel === "bom" ? "Bom" : aderenciaNivel === "medio" ? "Médio" : "Baixo"

  const handleGerarRelatorio = async () => {
    setGerandoRelatorio(true)
    try {
      const ok = await gerarRelatorioEstrategico(
        itens.map((i) => ({
          codigo: i.codigo,
          descricao: i.descricao,
          saldo: i.saldo,
          quantidade_minima: i.quantidade_minima ?? null,
          diferenca: i.diferenca ?? null,
          status: i.status,
        })),
      )
      if (!ok) {
        toast({
          title: "Não foi possível abrir o relatório",
          description: "Verifique se o navegador está bloqueando pop-ups.",
          variant: "destructive",
        })
      }
    } catch (err) {
      toast({
        title: "Erro ao gerar relatório",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setGerandoRelatorio(false)
    }
  }

  const filtrosAtivos = Object.keys(filtros).length > 0 || !!ordenacao

  const limparTodosFiltros = () => {
    setFiltros({})
    setOrdenacao(null)
  }

  const StatusBadge = ({ status }: { status: Status }) => {
    if (status === "OK") {
      return (
        <Badge className="bg-primary hover:bg-primary text-primary-foreground gap-1">
          <CheckCircle2 className="h-3 w-3" /> OK
        </Badge>
      )
    }
    if (status === "Repor") {
      return (
        <Badge variant="outline" className="gap-1 border-primary text-primary">
          <AlertTriangle className="h-3 w-3" /> Repor
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="gap-1 text-muted-foreground">
        <AlertTriangle className="h-3 w-3" /> Analisar
      </Badge>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="outline"
          onClick={handleGerarRelatorio}
          disabled={gerandoRelatorio || loading || itens.length === 0}
          className="gap-2"
        >
          {gerandoRelatorio ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          Gerar Relatório
        </Button>
        <Button onClick={() => setNovoDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Item Estratégico
        </Button>
      </div>

      {/* Faixa de KPIs principais */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* Aderência ao Estoque */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground">Aderência ao Estoque</p>
            <p className={`mt-1 text-4xl font-bold ${aderenciaCor}`}>{aderenciaPct}%</p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className={`h-full rounded-full ${aderenciaBarra}`} style={{ width: `${aderenciaPct}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {totalOk} de {totalAvaliaveis} itens dentro do mínimo
              </span>
              <Badge variant="outline" className={aderenciaCor}>
                {aderenciaRotulo}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Estoque abaixo do mínimo (donut) */}
        <Card>
          <CardContent className="flex items-center justify-between gap-4 pt-6">
            <div>
              <p className="text-4xl font-bold text-primary">{criticosPctTotal}%</p>
              <p className="mt-1 text-sm text-muted-foreground">do estoque está abaixo do mínimo</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {totalRepor} de {totalMonitorados} itens
              </p>
            </div>
            <DonutCritico pct={criticosPctTotal} />
          </CardContent>
        </Card>

        {/* Qtd. Total em Déficit */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Qtd. Total em Déficit</p>
                <p className="mt-1 text-4xl font-bold text-primary">{qtdRepor > 0 ? `-${qtdRepor}` : 0}</p>
                <p className="text-xs text-muted-foreground">Unidades abaixo do mínimo</p>
              </div>
              <div className="rounded-full bg-primary/10 p-3">
                <Package className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Impacto na operação</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Painel de análise: reposição, itens sem utilização e utilização */}
      <EstoqueEstrategicoAnalise itens={itens} />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" /> Itens Estratégicos
            </CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por código ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando dados...
            </div>
          ) : itensFiltrados.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">Nenhum item estratégico encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {COLUNAS.map((col) => (
                      <TableHead key={col.key} className={col.align === "center" ? "text-center" : ""}>
                        <div
                          className={
                            "flex items-center gap-0.5 " + (col.align === "center" ? "justify-center" : "")
                          }
                        >
                          <span>{col.label}</span>
                          <ColumnFilter
                            options={universoPorColuna[col.key]}
                            counts={contagensPorColuna[col.key]}
                            selected={filtros[col.key] ?? null}
                            onChange={(sel) => aplicarFiltroColuna(col.key, sel)}
                            sortDir={ordenacao?.key === col.key ? ordenacao.dir : null}
                            onSort={(dir) => ordenarColuna(col.key, dir)}
                            align={col.align === "center" ? "center" : "start"}
                          />
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itensFiltrados.map((item) => (
                    <TableRow
                      key={item.codigo}
                      className={item.status === "Analisar" ? "bg-accent/40 hover:bg-accent/60" : ""}
                    >
                      <TableCell className="font-mono font-medium">{item.codigo}</TableCell>
                      <TableCell>{item.descricao || "-"}</TableCell>
                      <TableCell className="text-center font-semibold">{item.saldo}</TableCell>
                      <TableCell className="text-center">{item.quantidade_minima ?? "-"}</TableCell>
                      <TableCell className="text-center">
                        {item.diferenca === null ? (
                          "-"
                        ) : (
                          <span className={item.diferenca < 0 ? "text-primary font-semibold" : "text-primary"}>
                            {item.diferenca > 0 ? `+${item.diferenca}` : item.diferenca}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={item.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => abrirEdicao(item)}
                            title={item.naListaMestre ? "Editar" : "Editar / Incluir na Lista Mestre"}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {item.naListaMestre ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removerDaListaMestre(item)}
                              title="Remover da Lista Mestre"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removerDaAnalise(item)}
                              title="Remover do controle estratégico"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de edição / incluir na Lista Mestre */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem?.naListaMestre ? "Editar Item" : "Classificar Item"}</DialogTitle>
            <DialogDescription>
              {editItem?.naListaMestre
                ? "Altere a descrição e a quantidade mínima na Lista Mestre."
                : "Defina a quantidade mínima e inclua este PN na Lista Mestre."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Código (PN)</Label>
              <Input value={editItem?.codigo || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-descricao">Descrição</Label>
              <Input
                id="edit-descricao"
                value={editForm.descricao}
                onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })}
                placeholder="Descrição do item"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-min">Quantidade Mínima</Label>
              <Input
                id="edit-min"
                type="number"
                min={0}
                value={editForm.quantidade_minima}
                onChange={(e) =>
                  setEditForm({ ...editForm, quantidade_minima: Number.parseInt(e.target.value) || 0 })
                }
              />
            </div>
            {editItem && !editItem.naListaMestre && (
              <p className="rounded-md bg-accent p-3 text-sm text-accent-foreground">
                Saldo atual: <strong>{editItem.saldo}</strong>. Após incluir, o status passará automaticamente para{" "}
                <strong>OK</strong> ou <strong>Repor</strong> conforme a quantidade mínima definida.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button onClick={salvarEdicao} disabled={salvando}>
              {salvando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : editItem?.naListaMestre ? (
                "Salvar Alterações"
              ) : (
                "Incluir na Lista Mestre"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de novo item */}
      <Dialog open={novoDialogOpen} onOpenChange={setNovoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Item Estratégico</DialogTitle>
            <DialogDescription>
              Cadastre manualmente um PN na Lista Mestre. Ele passará a fazer parte do controle imediatamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="novo-codigo">Código (PN)</Label>
              <Input
                id="novo-codigo"
                value={novoForm.codigo}
                onChange={(e) => setNovoForm({ ...novoForm, codigo: e.target.value })}
                placeholder="Digite o código da peça"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="novo-descricao">Descrição</Label>
              <Input
                id="novo-descricao"
                value={novoForm.descricao}
                onChange={(e) => setNovoForm({ ...novoForm, descricao: e.target.value })}
                placeholder="Descrição do item"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="novo-min">Quantidade Mínima</Label>
              <Input
                id="novo-min"
                type="number"
                min={0}
                value={novoForm.quantidade_minima}
                onChange={(e) =>
                  setNovoForm({ ...novoForm, quantidade_minima: Number.parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovoDialogOpen(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button onClick={salvarNovo} disabled={salvando}>
              {salvando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default EstoqueEstrategico
