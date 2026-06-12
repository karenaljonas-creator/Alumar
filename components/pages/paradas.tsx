"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, Loader2, Edit2, ArrowUpDown } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { getMachines, updateMachine } from "@/lib/supabase/data-service"
import type { Machine } from "@/lib/supabase/database.types"

export function Paradas() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [filterArea, setFilterArea] = useState<string>("all")
  const [filterModel, setFilterModel] = useState<string>("all")

  // Dialog de edição
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null)
  const [editForm, setEditForm] = useState({
    observations: "",
    prazo: "",
    acao_responsavel: "",
    responsavel: "",
  })

  // Sorting
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const machinesData = await getMachines()
      setMachines(machinesData)
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
    } finally {
      setLoading(false)
    }
  }

  // Filtra apenas máquinas com status "parado"
  const stoppedMachines = useMemo(() => {
    return machines.filter((m) => m.status === "parado")
  }, [machines])

  // Aplica filtros de busca e ordenação
  const filteredMachines = useMemo(() => {
    const filtered = stoppedMachines.filter((machine) => {
      const matchesSearch =
        searchTerm === "" ||
        machine.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
        machine.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        machine.serial_number?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesArea = filterArea === "all" || machine.area === filterArea
      const matchesModel = filterModel === "all" || machine.model === filterModel

      return matchesSearch && matchesArea && matchesModel
    })

    // Sort if column selected
    if (sortColumn) {
      filtered.sort((a, b) => {
        const aValue = (a as any)[sortColumn]?.toString().toLowerCase() || ''
        const bValue = (b as any)[sortColumn]?.toString().toLowerCase() || ''
        const compare = aValue.localeCompare(bValue)
        return sortDirection === 'asc' ? compare : -compare
      })
    }

    return filtered
  }, [stoppedMachines, searchTerm, filterArea, filterModel, sortColumn, sortDirection])

  const toggleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Obter listas únicas para filtros
  const uniqueAreas = useMemo(() => {
    return [...new Set(stoppedMachines.map((m) => m.area))].filter(Boolean).sort()
  }, [stoppedMachines])

  const uniqueModels = useMemo(() => {
    return [...new Set(stoppedMachines.map((m) => m.model))].filter(Boolean).sort()
  }, [stoppedMachines])

  const openEditDialog = (machine: Machine) => {
    setSelectedMachine(machine)
    setEditForm({
      observations: (machine as any).observations || "",
      prazo: (machine as any).prazo || "",
      acao_responsavel: machine.acao_responsavel || "",
      responsavel: machine.responsavel || "",
    })
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedMachine) return

    setSaving(true)
    try {
      await updateMachine(selectedMachine.id, {
        responsavel: editForm.responsavel,
        prazo: editForm.prazo || null,
        observacoes: editForm.observations,
      } as any)
      await loadData()
      setEditDialogOpen(false)
      setSelectedMachine(null)
    } catch (error) {
      console.error("Erro ao salvar:", error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-white min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Paradas</h1>
        <p className="text-muted-foreground">
          Equipamentos atualmente com status de parada
        </p>
      </div>

      {/* Busca e Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Campo de Busca */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por TAG, modelo ou número de série..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtros */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filtros</span>
            </div>

            <Select value={filterArea} onValueChange={setFilterArea}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Localização" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Localizações</SelectItem>
                {uniqueAreas.map((area) => (
                  <SelectItem key={area} value={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterModel} onValueChange={setFilterModel}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Modelo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Modelos</SelectItem>
                {uniqueModels.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Equipamentos Parados */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              Equipamentos Parados
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({filteredMachines.length} {filteredMachines.length === 1 ? "equipamento" : "equipamentos"})
              </span>
            </h2>
          </div>

          {filteredMachines.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {stoppedMachines.length === 0
                ? "Nenhum equipamento parado no momento."
                : "Nenhum equipamento encontrado com os filtros aplicados."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort('tag')}>
                      <div className="flex items-center gap-1">
                        TAG
                        <ArrowUpDown className={`h-4 w-4 ${sortColumn === 'tag' ? 'text-blue-600' : 'text-gray-400'}`} />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort('area')}>
                      <div className="flex items-center gap-1">
                        Localização
                        <ArrowUpDown className={`h-4 w-4 ${sortColumn === 'area' ? 'text-blue-600' : 'text-gray-400'}`} />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort('model')}>
                      <div className="flex items-center gap-1">
                        Modelo
                        <ArrowUpDown className={`h-4 w-4 ${sortColumn === 'model' ? 'text-blue-600' : 'text-gray-400'}`} />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort('serial_number')}>
                      <div className="flex items-center gap-1">
                        Série
                        <ArrowUpDown className={`h-4 w-4 ${sortColumn === 'serial_number' ? 'text-blue-600' : 'text-gray-400'}`} />
                      </div>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tempo Parada</TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort('acao_responsavel')}>
                      <div className="flex items-center gap-1">
                        Ação Responsável
                        <ArrowUpDown className={`h-4 w-4 ${sortColumn === 'acao_responsavel' ? 'text-blue-600' : 'text-gray-400'}`} />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort('prazo')}>
                      <div className="flex items-center gap-1">
                        Prazo
                        <ArrowUpDown className={`h-4 w-4 ${sortColumn === 'prazo' ? 'text-blue-600' : 'text-gray-400'}`} />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort('responsavel')}>
                      <div className="flex items-center gap-1">
                        Responsável
                        <ArrowUpDown className={`h-4 w-4 ${sortColumn === 'responsavel' ? 'text-blue-600' : 'text-gray-400'}`} />
                      </div>
                    </TableHead>
                    <TableHead>Ações</TableHead>
                    <TableHead>Última Atualização</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMachines.map((machine) => {
                    // Calcula dias de parada
                    const dataParada = (machine as any).data_parada
                    let diasParada = 0
                    if (dataParada) {
                      const dataInicio = new Date(dataParada)
                      const hoje = new Date()
                      diasParada = Math.ceil((hoje.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24))
                    }
                    
                    return (
                      <TableRow key={machine.id}>
                        <TableCell className="font-medium">{machine.tag}</TableCell>
                        <TableCell>{machine.area}</TableCell>
                        <TableCell>{machine.model}</TableCell>
                        <TableCell>{machine.serial_number || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">Parada</Badge>
                        </TableCell>
                        <TableCell>
                          {dataParada ? (
                            <span className={diasParada > 30 ? "text-red-600 font-medium" : ""}>
                              {diasParada} dias
                            </span>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {(machine as any).acao_responsavel || "-"}
                        </TableCell>
                        <TableCell>
                          {(machine as any).prazo
                            ? format(new Date((machine as any).prazo), "dd/MM/yyyy", { locale: ptBR })
                            : "-"}
                        </TableCell>
                        <TableCell>{(machine as any).responsavel || "-"}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(machine)}
                          >
                            <Edit2 className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                        </TableCell>
                        <TableCell>
                          {machine.updated_at
                            ? format(new Date(machine.updated_at), "dd/MM/yyyy HH:mm", {
                                locale: ptBR,
                              })
                            : "-"}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Editar Informações - {selectedMachine?.tag}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="prazo">Prazo</Label>
              <Input
                id="prazo"
                type="date"
                value={editForm.prazo}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, prazo: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsavel">Responsável</Label>
              <Input
                id="responsavel"
                value={editForm.responsavel}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, responsavel: e.target.value }))
                }
                placeholder="Nome do responsável"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observations">Observações</Label>
              <Textarea
                id="observations"
                value={editForm.observations}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, observations: e.target.value }))
                }
                placeholder="Observações adicionais..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
