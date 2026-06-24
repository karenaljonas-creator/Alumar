"use client"

import { useState, useEffect } from "react"
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
import { Plus, Search, Edit, Trash2, ShieldCheck, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react"

type Status = "OK" | "Repor" | "Analisar"

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

export function EstoqueEstrategico() {
  const [itens, setItens] = useState<ItemEstrategico[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
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

  const itensFiltrados = itens.filter((i) => {
    const termo = searchTerm.toLowerCase()
    return i.codigo.toLowerCase().includes(termo) || i.descricao.toLowerCase().includes(termo)
  })

  const totalRepor = itens.filter((i) => i.status === "Repor").length
  const totalAnalisar = itens.filter((i) => i.status === "Analisar").length
  const totalOk = itens.filter((i) => i.status === "OK").length

  const StatusBadge = ({ status }: { status: Status }) => {
    if (status === "OK") {
      return (
        <Badge className="bg-green-600 hover:bg-green-600 text-white gap-1">
          <CheckCircle2 className="h-3 w-3" /> OK
        </Badge>
      )
    }
    if (status === "Repor") {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" /> Repor
        </Badge>
      )
    }
    return (
      <Badge className="bg-yellow-400 hover:bg-yellow-400 text-yellow-950 gap-1">
        <AlertTriangle className="h-3 w-3" /> Analisar
      </Badge>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button onClick={() => setNovoDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Item Estratégico
        </Button>
      </div>

      {/* Indicadores */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Repor (abaixo do mínimo)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{totalRepor}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Analisar (fora da Lista Mestre)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-500">{totalAnalisar}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">OK (dentro do mínimo)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{totalOk}</div>
          </CardContent>
        </Card>
      </div>

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
                    <TableHead>Código (PN)</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-center">Saldo</TableHead>
                    <TableHead className="text-center">Qtd. Mínima</TableHead>
                    <TableHead className="text-center">Diferença</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itensFiltrados.map((item) => (
                    <TableRow
                      key={item.codigo}
                      className={item.status === "Analisar" ? "bg-yellow-50 hover:bg-yellow-100" : ""}
                    >
                      <TableCell className="font-mono font-medium">{item.codigo}</TableCell>
                      <TableCell>{item.descricao || "-"}</TableCell>
                      <TableCell className="text-center font-semibold">{item.saldo}</TableCell>
                      <TableCell className="text-center">{item.quantidade_minima ?? "-"}</TableCell>
                      <TableCell className="text-center">
                        {item.diferenca === null ? (
                          "-"
                        ) : (
                          <span className={item.diferenca < 0 ? "text-destructive font-semibold" : "text-green-600"}>
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
              <p className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
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
