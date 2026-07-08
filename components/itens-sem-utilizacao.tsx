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
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { PackageX, HelpCircle } from "lucide-react"

const ORIGEM_ESTRATEGICA = "Estoque estratégico - corretivos"
const LIMITE_INICIAL = 4

interface ItemSemUso {
  codigo: string
  descricao: string
  dataEntrada: string | null
  diasSemUso: number
}

function formatarData(data: string | null): string {
  if (!data) return "-"
  const d = new Date(data)
  if (Number.isNaN(d.getTime())) return "-"
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" })
}

function calcularDias(data: string | null): number {
  if (!data) return 0
  const d = new Date(data)
  if (Number.isNaN(d.getTime())) return 0
  const hoje = new Date()
  const diff = hoje.getTime() - d.getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

export function ItensSemUtilizacao() {
  const [itens, setItens] = useState<ItemSemUso[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarTodos, setMostrarTodos] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const loadDados = useCallback(async () => {
    setLoading(true)
    try {
      // Entradas com origem estratégica
      const { data: entradas } = await supabase
        .from("estoque_pecas")
        .select("codigo, descricao, origem, data_emissao")
        .eq("origem", ORIGEM_ESTRATEGICA)

      // Todas as saídas (para saber quais códigos já foram utilizados)
      const { data: saidas } = await supabase.from("saida_pecas").select("codigo")

      const codigosComSaida = new Set<string>((saidas || []).map((s) => s.codigo))

      // Agrupar entradas por código, mantendo a data de entrada mais antiga
      const mapa = new Map<string, ItemSemUso>()
      for (const e of entradas || []) {
        if (codigosComSaida.has(e.codigo)) continue // já foi utilizado
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
            diasSemUso: 0,
          })
        }
      }

      const linhas = [...mapa.values()].map((item) => ({
        ...item,
        diasSemUso: calcularDias(item.dataEntrada),
      }))

      // Mais dias sem utilização primeiro
      linhas.sort((a, b) => b.diasSemUso - a.diasSemUso || a.codigo.localeCompare(b.codigo))

      setItens(linhas)
    } catch {
      toast({ title: "Erro ao carregar itens sem utilização", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [supabase, toast])

  useEffect(() => {
    loadDados()
  }, [loadDados])

  const visiveis = mostrarTodos ? itens : itens.slice(0, LIMITE_INICIAL)

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <PackageX className="h-5 w-5" /> Itens Sem Utilização
          </CardTitle>
          <span
            className="text-muted-foreground"
            title="Itens estratégicos que deram entrada mas nunca tiveram saída (nunca utilizados desde a entrada)."
            aria-label="Ajuda sobre itens sem utilização"
          >
            <HelpCircle className="h-5 w-5" />
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Carregando itens...</p>
        ) : itens.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Todos os itens estratégicos já foram utilizados ao menos uma vez.
          </p>
        ) : (
          <>
            {/* Destaque numérico */}
            <div className="mb-4 flex items-baseline gap-3">
              <span className="text-5xl font-bold text-primary">{itens.length}</span>
              <span className="text-sm text-muted-foreground">Itens nunca utilizados desde a entrada</span>
            </div>

            <div className="overflow-x-auto">
              <Table className="w-full min-w-[520px]">
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead>Código (PN)</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="whitespace-nowrap">Entrada</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Dias sem utilização</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visiveis.map((item) => (
                    <TableRow key={item.codigo}>
                      <TableCell className="font-mono text-sm text-primary">{item.codigo}</TableCell>
                      <TableCell>{item.descricao || "-"}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatarData(item.dataEntrada)}</TableCell>
                      <TableCell className="text-center font-medium">{item.diasSemUso}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {itens.length > LIMITE_INICIAL && (
              <button
                type="button"
                onClick={() => setMostrarTodos((v) => !v)}
                className="mt-4 text-sm font-medium text-primary transition-colors hover:underline"
              >
                {mostrarTodos ? "Mostrar menos" : `Ver todos os ${itens.length} itens →`}
              </button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
