"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Upload,
  Trash2,
  Loader2,
  ChevronRight,
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { 
  getWeeklySnapshots, 
  deleteWeeklySnapshot,
  type WeeklySnapshot 
} from "@/lib/supabase/data-service"

export function Historico() {
  const [snapshots, setSnapshots] = useState<WeeklySnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [filterWeek, setFilterWeek] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterContrato, setFilterContrato] = useState("all")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    loadSnapshots()
  }, [])

  const loadSnapshots = async () => {
    try {
      const data = await getWeeklySnapshots()
      setSnapshots(data)
    } catch (error) {
      console.error("Erro ao carregar histórico:", error)
    } finally {
      setLoading(false)
    }
  }

  const weeks = [...new Set(snapshots.map(s => s.week_code))].sort().reverse()

  const filteredSnapshots = snapshots.filter((snapshot) => {
    const matchesWeek = filterWeek === "all" || snapshot.week_code === filterWeek
    return matchesWeek
  })

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este registro?")) return
    
    setDeleting(id)
    try {
      await deleteWeeklySnapshot(id)
      await loadSnapshots()
    } catch (error) {
      console.error("Erro ao excluir:", error)
    } finally {
      setDeleting(null)
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR })
    } catch {
      return dateStr
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6 bg-background min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Histórico de Máquinas</h1>
          <p className="text-sm text-muted-foreground">
            Visualize a evolução completa semana a semana de todas as máquinas
          </p>
        </div>
        <Button variant="outline" disabled className="flex-shrink-0">
          <Upload className="mr-2 h-4 w-4" />
          Importar Histórico
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-border p-6">
        <div className="flex items-end gap-8">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-foreground">Filtrar por Semana</span>
            <Select value={filterWeek} onValueChange={setFilterWeek}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todas as Semanas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Semanas</SelectItem>
                {weeks.map((week) => (
                  <SelectItem key={week} value={week}>
                    {week}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-foreground">Filtrar por Status</span>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Todos os Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="operacional">Operacionais</SelectItem>
                <SelectItem value="parado">Parados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-foreground">Filtrar por Contrato</span>
            <Select value={filterContrato} onValueChange={setFilterContrato}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="sim">Sim</SelectItem>
                <SelectItem value="nao">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-lg border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Histórico de Registros</h3>
              <p className="text-sm text-muted-foreground">{snapshots.length} snapshots salvos</p>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border hover:bg-transparent bg-muted/50">
                <TableHead className="w-12 px-4 py-3"></TableHead>
                <TableHead className="px-4 py-3">Semana</TableHead>
                <TableHead className="px-4 py-3">Data</TableHead>
                <TableHead className="px-4 py-3 text-center">Total</TableHead>
                <TableHead className="px-4 py-3 text-center">Operacionais</TableHead>
                <TableHead className="px-4 py-3 text-center">Paradas</TableHead>
                <TableHead className="px-4 py-3 text-center">Disponibilidade</TableHead>
                <TableHead className="w-12 px-4 py-3 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSnapshots.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSnapshots.map((snapshot) => (
                  <TableRow key={snapshot.id} className="border-b border-border/50 hover:bg-muted/20">
                    <TableCell className="w-12 px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => toggleRow(snapshot.id)}
                      >
                        <ChevronRight
                          className={`h-4 w-4 transition-transform ${
                            expandedRows.has(snapshot.id) ? "rotate-90" : ""
                          }`}
                        />
                      </Button>
                    </TableCell>
                    <TableCell className="px-4 py-3 font-medium">{snapshot.week_code}</TableCell>
                    <TableCell className="px-4 py-3">{formatDate(snapshot.week_date)}</TableCell>
                    <TableCell className="px-4 py-3 text-center font-medium">{snapshot.total}</TableCell>
                    <TableCell className="px-4 py-3 text-center">
                      <Badge className="bg-green-500 hover:bg-green-600">
                        {snapshot.operacionais}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-center">
                      <Badge variant="destructive" className="font-medium">
                        {snapshot.paradas}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-center font-medium">
                      {snapshot.disponibilidade.toFixed(1)}%
                    </TableCell>
                    <TableCell className="w-12 px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-destructive/10"
                        onClick={() => handleDelete(snapshot.id)}
                        disabled={deleting === snapshot.id}
                      >
                        {deleting === snapshot.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Expanded Row Details */}
        {Array.from(expandedRows).map((rowId) => {
          const snapshot = snapshots.find(s => s.id === rowId)
          if (!snapshot || !snapshot.machine_details || snapshot.machine_details.length === 0) return null

          return (
            <div key={`${rowId}-details`} className="border-t border-border bg-muted/30 p-4">
              <div className="rounded border border-border bg-white overflow-x-auto">
                <Table className="text-sm">
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-transparent">
                      <TableHead className="px-4 py-2">TAG</TableHead>
                      <TableHead className="px-4 py-2">Área</TableHead>
                      <TableHead className="px-4 py-2">Modelo</TableHead>
                      <TableHead className="px-4 py-2">Nº Série</TableHead>
                      <TableHead className="px-4 py-2">Contrato</TableHead>
                      <TableHead className="px-4 py-2">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {snapshot.machine_details
                      .filter(m => {
                        if (filterStatus !== "all" && m.status !== filterStatus) return false
                        if (filterContrato === "sim" && !m.in_contract) return false
                        if (filterContrato === "nao" && m.in_contract) return false
                        return true
                      })
                      .map((machine) => (
                        <TableRow key={machine.id} className="border-b border-border/50 hover:bg-muted/20">
                          <TableCell className="px-4 py-2 font-medium">{machine.tag}</TableCell>
                          <TableCell className="px-4 py-2">{machine.area}</TableCell>
                          <TableCell className="px-4 py-2">{machine.model}</TableCell>
                          <TableCell className="px-4 py-2">{machine.serial_number}</TableCell>
                          <TableCell className="px-4 py-2">
                            <Badge variant={machine.in_contract ? "default" : "secondary"} className={machine.in_contract ? "bg-blue-500" : ""}>
                              {machine.in_contract ? "Sim" : "Não"}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 py-2">
                            {machine.status === "operacional" && (
                              <Badge className="bg-green-500">Operacional</Badge>
                            )}
                            {machine.status === "parado" && (
                              <Badge variant="destructive">Parado</Badge>
                            )}
                            {machine.status === "desativado" && (
                              <Badge variant="secondary">Desativado</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
