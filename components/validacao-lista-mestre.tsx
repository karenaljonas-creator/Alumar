"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { ClipboardCheck, HelpCircle, AlertTriangle } from "lucide-react"

const ORIGEM_ESTRATEGICA = "Estoque estratégico - corretivos"
const LIMITE_INICIAL = 7

interface ItemPendente {
  codigo: string
  descricao: string
  dataEntrada: string | null
}

function formatarData(data: string | null): string {
  if (!data) return "-"
  const d = new Date(data)
  if (Number.isNaN(d.getTime())) return "-"
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" })
}

export function ValidacaoListaMestre() {
  const [pendentes, setPendentes] = useState<ItemPendente[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarTodos, setMostrarTodos] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  // Dialog de validação (classificação -> inclusão na Lista Mestre)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [itemAtual, setItemAtual] = useState<ItemPendente | null>(null)
  const [form, setForm] = useState({ descricao: "", quantidade_minima: 1 })
  const [salvando, setSalvando] = useState(false)

  const loadDados = useCallback(async () => {
    setLoading(true)
    try {
      // Entradas com origem estratégica
      const { data: entradas } = await supabase
        .from("estoque_pecas")
        .select("codigo, descricao, origem, data_emissao")
        .eq("origem", ORIGEM_ESTRATEGICA)

      // Lista Mestre (para saber o que já está cadastrado)
      const { data: listaMestre } = await supabase.from("lista_mestre").select("codigo")

      const codigosMestre = new Set<string>((listaMestre || []).map((m) => m.codigo))

      // Agrupar por código, mantendo a descrição e a data de entrada mais antiga
      const mapa = new Map<string, ItemPendente>()
      for (const e of entradas || []) {
        if (codigosMestre.has(e.codigo)) continue // já está na Lista Mestre
        const existente = mapa.get(e.codigo)
        if (existente) {
          if (!existente.descricao && e.descricao) existente.descricao = e.descricao
          if (e.data_emissao && (!existente.dataEntrada || e.data_emissao < existente.dataEntrada)) {
            existente.dataEntrada = e.data_emissao
          }
        } else {
          mapa.set(e.codigo, {
            codigo: e.codigo,
            descricao: e.descricao || "",
            dataEntrada: e.data_emissao || null,
          })
        }
      }

      const linhas = [...mapa.values()].sort((a, b) => {
        // Mais recentes primeiro
        const da = a.dataEntrada || ""
        const db = b.dataEntrada || ""
        return db.localeCompare(da) || a.codigo.localeCompare(b.codigo)
      })

      setPendentes(linhas)
    } catch {
      toast({ title: "Erro ao carregar pendências de classificação", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [supabase, toast])

  useEffect(() => {
    loadDados()
  }, [loadDados])

  const abrirValidacao = (item: ItemPendente) => {
    setItemAtual(item)
    setForm({ descricao: item.descricao, quantidade_minima: 1 })
    setDialogOpen(true)
  }

  const confirmarValidacao = async () => {
    if (!itemAtual) return
    setSalvando(true)
    try {
      const { error } = await supabase.from("lista_mestre").insert({
        codigo: itemAtual.codigo,
        descricao: form.descricao,
        quantidade_minima: form.quantidade_minima,
      })
      if (error) {
        toast({ title: "Erro ao validar item", description: error.message, variant: "destructive" })
        return
      }
      toast({
        title: "Item classificado",
        description: `${itemAtual.codigo} foi incluído na Lista Mestre.`,
      })
      setDialogOpen(false)
      setItemAtual(null)
      await loadDados()
    } finally {
      setSalvando(false)
    }
  }

  const visiveis = mostrarTodos ? pendentes : pendentes.slice(0, LIMITE_INICIAL)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" /> Validação da Lista Mestre (Pendências de Classificação)
          </CardTitle>
          <span
            className="text-muted-foreground"
            title="Itens que deram entrada com origem &quot;Estoque Estratégico&quot; mas ainda não foram cadastrados na Lista Mestre. Valide cada um para definir o estoque mínimo."
            aria-label="Ajuda sobre pendências de classificação"
          >
            <HelpCircle className="h-5 w-5" />
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {/* Banner explicativo */}
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm text-foreground">
              Itens que deram entrada com origem &quot;Estoque Estratégico&quot; mas não estão cadastrados na Lista
              Mestre do Estoque Estratégico.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Carregando pendências...</p>
        ) : pendentes.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma pendência de classificação. Todos os itens estratégicos estão na Lista Mestre.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table className="w-full min-w-[720px]">
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead>Código (PN)</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Data Entrada</TableHead>
                    <TableHead className="text-center">Existe na Lista Mestre</TableHead>
                    <TableHead>Ação recomendada</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visiveis.map((item) => (
                    <TableRow key={item.codigo}>
                      <TableCell className="font-mono text-sm text-primary">{item.codigo}</TableCell>
                      <TableCell>{item.descricao || "-"}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatarData(item.dataEntrada)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="border-destructive/40 text-destructive">
                          Não
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">Validar classificação</TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-primary/40 text-primary hover:bg-primary/10"
                          onClick={() => abrirValidacao(item)}
                        >
                          Validar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {pendentes.length > LIMITE_INICIAL && (
              <button
                type="button"
                onClick={() => setMostrarTodos((v) => !v)}
                className="mt-4 text-sm font-medium text-primary transition-colors hover:underline"
              >
                {mostrarTodos
                  ? "Mostrar menos"
                  : `Ver todos os ${pendentes.length} itens pendentes →`}
              </button>
            )}
          </>
        )}
      </CardContent>

      {/* Dialog de validação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Validar classificação</DialogTitle>
            <DialogDescription>
              Cadastre o item na Lista Mestre do Estoque Estratégico definindo o estoque mínimo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label>Código (PN)</Label>
              <Input value={itemAtual?.codigo ?? ""} disabled className="font-mono" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="val-descricao">Descrição</Label>
              <Input
                id="val-descricao"
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Descrição do item"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="val-minima">Quantidade mínima</Label>
              <Input
                id="val-minima"
                type="number"
                min={0}
                value={form.quantidade_minima}
                onChange={(e) =>
                  setForm((f) => ({ ...f, quantidade_minima: Math.max(0, Number(e.target.value) || 0) }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button onClick={confirmarValidacao} disabled={salvando || !form.descricao.trim()}>
              {salvando ? "Salvando..." : "Confirmar classificação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
