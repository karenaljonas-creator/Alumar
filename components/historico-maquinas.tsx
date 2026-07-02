"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import type { Machine, WeeklySnapshot } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight, Trash2 } from "@/lib/lucide-react"
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react"

type DetailSortKey = "nome" | "tipo" | "localizacao" | "contrato" | "tipoEquip" | "status" | "preventiva" | "acao" | "responsavel" | "observacoes"
type SortDirection = "asc" | "desc"
import { loadHistory, deleteSnapshot } from "@/lib/supabase-history-storage"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

interface HistoricoMaquinasProps {
  machines: Machine[]
}

export function HistoricoMaquinas({ machines }: HistoricoMaquinasProps) {
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<string>("todos")
  const [semanaFilter, setSemanaFilter] = useState<string>("todas")
  const [contratoFilter, setContratoFilter] = useState<string>("todos")
  const [refreshKey, setRefreshKey] = useState(0)
  const [history, setHistory] = useState<WeeklySnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true)
      const data = await loadHistory()
      setHistory(data.sort((a, b) => new Date(b.dataRegistro).getTime() - new Date(a.dataRegistro).getTime()))
      setLoading(false)
    }
    fetchHistory()
  }, [refreshKey])

  const filteredHistory = useMemo(() => {
    if (semanaFilter === "todas") return history
    return history.filter((h) => h.semana === semanaFilter)
  }, [history, semanaFilter])

  const toggleWeek = (semana: string) => {
    const newExpanded = new Set(expandedWeeks)
    if (newExpanded.has(semana)) {
      newExpanded.delete(semana)
    } else {
      newExpanded.add(semana)
    }
    setExpandedWeeks(newExpanded)
  }

  const getMaquinasDaSemana = (semana: string): Machine[] => {
    const snapshot = history.find((h) => h.semana === semana)
    if (!snapshot) return []

    let maquinas = snapshot.machines

    if (statusFilter !== "todos") {
      maquinas = maquinas.filter((m) => m.status === statusFilter)
    }

    if (contratoFilter === "sim") {
      maquinas = maquinas.filter((m) => m.temContrato === true)
    } else if (contratoFilter === "nao") {
      maquinas = maquinas.filter((m) => m.temContrato === false)
    }

    return maquinas
  }

  const handleDeleteSnapshot = async (id: string, semana: string) => {
    if (confirm(`Tem certeza que deseja excluir o registro da semana ${semana}?`)) {
      try {
        await deleteSnapshot(id)
        toast({
          title: "Registro excluído",
          description: `O registro da semana ${semana} foi removido com sucesso.`,
        })
        setRefreshKey((prev) => prev + 1)
      } catch (error) {
        console.error("[v0] Error deleting snapshot:", error)
        toast({
          title: "Erro ao excluir",
          description: "Não foi possível excluir o registro. Tente novamente.",
          variant: "destructive",
        })
      }
    }
  }

  const semanasDisponiveis = useMemo(() => {
    return history.map((h) => h.semana)
  }, [history])

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <div className="text-center py-12 text-muted-foreground">
            <p>Carregando histórico...</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="semana-filter">Filtrar por Semana</Label>
            <Select value={semanaFilter} onValueChange={setSemanaFilter}>
              <SelectTrigger id="semana-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as Semanas</SelectItem>
                {semanasDisponiveis.map((semana) => (
                  <SelectItem key={semana} value={semana}>
                    {semana}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status-filter">Filtrar por Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="operacional">Operacional</SelectItem>
                <SelectItem value="parada">Parada</SelectItem>
                <SelectItem value="manutencao">Manutenção</SelectItem>
                <SelectItem value="v0">V0</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contrato-filter">Filtrar por Contrato</Label>
            <Select value={contratoFilter} onValueChange={setContratoFilter}>
              <SelectTrigger id="contrato-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="sim">Sim</SelectItem>
                <SelectItem value="nao">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Histórico de Registros</h3>
            <p className="text-sm text-muted-foreground">{filteredHistory.length} snapshots salvos</p>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Semana</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Operacionais</TableHead>
                  <TableHead className="text-center">Paradas</TableHead>
                  <TableHead className="text-center">Manutenção</TableHead>
                  <TableHead className="text-center">Disponibilidade</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((snapshot) => {
                  const isExpanded = expandedWeeks.has(snapshot.semana)
                  const maquinasDaSemana = getMaquinasDaSemana(snapshot.semana)

                  return (
                    <>
                      <TableRow key={snapshot.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleWeek(snapshot.semana)}
                            className="h-8 w-8 p-0"
                          >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">{snapshot.semana}</TableCell>
                        <TableCell>{new Date(snapshot.dataRegistro).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell className="text-center font-medium">{snapshot.stats.total}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="default" className="bg-primary hover:bg-primary">
                            {snapshot.stats.operacionais}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="destructive">{snapshot.stats.paradas}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="text-muted-foreground">
                            {snapshot.stats.manutencao}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {snapshot.stats.disponibilidade.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSnapshot(snapshot.id, snapshot.semana)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Excluir registro"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={11} className="bg-muted/20 p-0">
                            <div className="p-6">
                              <h4 className="text-sm font-semibold mb-4">
                                Detalhamento - {maquinasDaSemana.length} máquinas
                                {(statusFilter !== "todos" || contratoFilter !== "todos") &&
                                  ` (filtradas por: ${[
                                    statusFilter !== "todos" ? `status: ${statusFilter}` : null,
                                    contratoFilter !== "todos" ? `contrato: ${contratoFilter}` : null,
                                  ]
                                    .filter(Boolean)
                                    .join(", ")})`}
                              </h4>
                              <div className="rounded-lg border border-border overflow-hidden">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-muted">
                                      <TableHead>TAG</TableHead>
                                      <TableHead>Modelo</TableHead>
                                      <TableHead>Localização</TableHead>
                                      <TableHead>Contrato</TableHead>
                                      <TableHead>Tipo</TableHead>
                                      <TableHead>Status</TableHead>
                                      <TableHead>Categoria</TableHead>
                                      <TableHead>Preventiva</TableHead>
                                      <TableHead>Ação</TableHead>
                                      <TableHead className="text-center">Responsável</TableHead>
                                      <TableHead className="min-w-[300px]">Observações</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {maquinasDaSemana.length > 0 ? (
                                      maquinasDaSemana.map((maquina) => (
                                        <TableRow key={maquina.id}>
                                          <TableCell className="font-medium">{maquina.nome}</TableCell>
                                          <TableCell className="text-sm">{maquina.tipo}</TableCell>
                                          <TableCell className="text-sm">{maquina.localizacao}</TableCell>
                                          <TableCell className="text-sm">
                                            {maquina.temContrato ? "Sim" : "Não"}
                                          </TableCell>
                                          <TableCell className="text-sm">
                                            {maquina.tipo.includes("Compressor")
                                              ? "Compressor"
                                              : maquina.tipo.includes("Secador")
                                                ? "Secador"
                                                : maquina.tipo.includes("Soprador")
                                                  ? "Soprador"
                                                  : "Filtro"}
                                          </TableCell>
                                          <TableCell>
                                            <Badge
                                              variant={
                                                maquina.status === "operacional"
                                                  ? "default"
                                                  : maquina.status === "parada"
                                                    ? "destructive"
                                                    : "secondary"
                                              }
                                              className={
                                                maquina.status === "operacional"
                                                  ? "bg-primary hover:bg-primary"
                                                  : maquina.status === "manutencao"
                                                    ? "bg-muted text-muted-foreground hover:bg-muted"
                                                    : maquina.status === "v0"
                                                      ? "bg-secondary text-secondary-foreground"
                                                      : ""
                                              }
                                            >
                                              {maquina.status === "operacional"
                                                ? "Operacional"
                                                : maquina.status === "parada"
                                                  ? "Parada"
                                                  : maquina.status === "v0"
                                                    ? "V0"
                                                    : "Manutenção"}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="text-sm">
                                            {maquina.status === "parada" ? (
                                              maquina.categoriaParada ? (
                                                <Badge
                                                  variant="outline"
                                                  className="bg-red-50 text-red-700 border-red-200 whitespace-nowrap"
                                                >
                                                  {maquina.categoriaParada}
                                                </Badge>
                                              ) : (
                                                "-"
                                              )
                                            ) : (
                                              "-"
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            <Badge
                                              variant={
                                                maquina.statusPreventiva === "OK"
                                                  ? "default"
                                                  : maquina.statusPreventiva === "Em Atraso"
                                                    ? "destructive"
                                                    : "secondary"
                                              }
                                              className={
                                                maquina.statusPreventiva === "OK"
                                                  ? "bg-primary hover:bg-primary"
                                                  : ""
                                              }
                                            >
                                              {maquina.statusPreventiva || "N/A"}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="text-sm">{maquina.acaoResponsavel}</TableCell>
                                          <TableCell className="text-sm text-center">{maquina.responsavel || "-"}</TableCell>
                                          <TableCell className="text-sm min-w-[300px] whitespace-normal">
                                            {maquina.motivoParada || "-"}
                                          </TableCell>
                                        </TableRow>
                                      ))
                                    ) : (
                                      <TableRow>
                                        <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                                          Nenhuma máquina encontrada com os filtros aplicados
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {filteredHistory.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhum histórico encontrado.</p>
              <p className="text-sm mt-2">Comece a registrar dados semanais na aba "Registro Semanal".</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
