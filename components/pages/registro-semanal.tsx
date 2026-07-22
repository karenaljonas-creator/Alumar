"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
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
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Search,
  Filter,
  Send,
  Upload,
  Download,
  Edit2,
  Trash2,
  Loader2,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from "lucide-react"
import { 
  getMachines, 
  updateMachine,
  deleteMachine,
  createWeeklySnapshot,
} from "@/lib/supabase/data-service"
import type { Machine } from "@/lib/supabase/database.types"

export function RegistroSemanal() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterArea, setFilterArea] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterContrato, setFilterContrato] = useState("all")
  
  // Edit dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMachineIndex, setEditingMachineIndex] = useState(0)
  const [editStatus, setEditStatus] = useState<"operacional" | "parado" | "desativado">("operacional")
  const [editManutencaoPreventiva, setEditManutencaoPreventiva] = useState<"ok" | "em_planejamento" | "em_atraso">("ok")
  const [editResponsavel, setEditResponsavel] = useState("")
  const [editAcaoResponsavel, setEditAcaoResponsavel] = useState<"" | "Alumar" | "Atlas Copco">("")
  const [editDataParada, setEditDataParada] = useState("")
  const [editObservacoes, setEditObservacoes] = useState("")
  const [saving, setSaving] = useState(false)

  // Success dialog
  const [showSuccess, setShowSuccess] = useState(false)

  // Sorting
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Deleting
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    loadMachines()
  }, [])

  const loadMachines = async () => {
    try {
      const data = await getMachines()
      setMachines(data)
    } catch (error) {
      console.error("Erro ao carregar máquinas:", error)
    } finally {
      setLoading(false)
    }
  }

  const areas = [...new Set(machines.map((m) => m.area))].sort()

  const filteredMachines = machines.filter((machine) => {
    const matchesSearch =
      machine.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      machine.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      machine.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      machine.area.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesArea = filterArea === "all" || machine.area === filterArea
    const matchesStatus = filterStatus === "all" || machine.status === filterStatus
    const matchesContrato = filterContrato === "all" || 
      (filterContrato === "sim" && machine.in_contract) ||
      (filterContrato === "nao" && !machine.in_contract)
    return matchesSearch && matchesArea && matchesStatus && matchesContrato
  }).sort((a, b) => {
    if (!sortColumn) return 0
    const aValue = (a as any)[sortColumn]?.toString().toLowerCase() || ''
    const bValue = (b as any)[sortColumn]?.toString().toLowerCase() || ''
    const compare = aValue.localeCompare(bValue)
    return sortDirection === 'asc' ? compare : -compare
  })

  const toggleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const handleDelete = async (machine: Machine) => {
    if (!confirm(`Tem certeza que deseja excluir a máquina ${machine.tag}?`)) return
    
    setDeleting(machine.id)
    try {
      await deleteMachine(machine.id)
      await loadMachines()
    } catch (error) {
      console.error("Erro ao excluir máquina:", error)
      alert("Erro ao excluir máquina. Tente novamente.")
    } finally {
      setDeleting(null)
    }
  }

  const editingMachine = filteredMachines[editingMachineIndex]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "operacional":
        return <Badge className="bg-[#0099cc] hover:bg-[#0088bb]">Operacional</Badge>
      case "parado":
        return <Badge variant="destructive">Parada</Badge>
      case "desativado":
        return <Badge variant="secondary">Desativado</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const openEditDialog = (machine: Machine) => {
    const index = filteredMachines.findIndex(m => m.id === machine.id)
    setEditingMachineIndex(index >= 0 ? index : 0)
    loadMachineToForm(machine)
    setIsDialogOpen(true)
  }

  const loadMachineToForm = (machine: Machine) => {
    setEditStatus(machine.status as "operacional" | "parado" | "desativado")
    setEditManutencaoPreventiva((machine as any).manutencao_preventiva || "ok")
    setEditResponsavel((machine as any).responsavel || "")
    setEditAcaoResponsavel((machine as any).acao_responsavel || "")
    setEditDataParada((machine as any).data_parada || "")
    setEditObservacoes((machine as any).observacoes || "")
  }

  const calculateDaysParada = () => {
    if (!editDataParada) return 0
    const dataParada = new Date(editDataParada)
    const hoje = new Date()
    const diffTime = Math.abs(hoje.getTime() - dataParada.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const handleSaveStatus = async (goToNext = false) => {
    if (!editingMachine) return

    setSaving(true)
    try {
      await updateMachine(editingMachine.id, { 
        status: editStatus,
        manutencao_preventiva: editManutencaoPreventiva,
        responsavel: editResponsavel,
        acao_responsavel: editAcaoResponsavel,
        data_parada: editDataParada || null,
        observacoes: editObservacoes,
      } as any)
      await loadMachines()
      
      if (goToNext && editingMachineIndex < filteredMachines.length - 1) {
        const nextIndex = editingMachineIndex + 1
        setEditingMachineIndex(nextIndex)
        loadMachineToForm(filteredMachines[nextIndex])
      } else if (!goToNext) {
        setIsDialogOpen(false)
      }
    } catch (error) {
      console.error("Erro ao salvar:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleNavigate = (direction: "prev" | "next") => {
    const newIndex = direction === "prev" 
      ? Math.max(0, editingMachineIndex - 1)
      : Math.min(filteredMachines.length - 1, editingMachineIndex + 1)
    setEditingMachineIndex(newIndex)
    loadMachineToForm(filteredMachines[newIndex])
  }

  const handleEnviarRegistro = async () => {
    setSending(true)
    try {
      await createWeeklySnapshot(machines)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      console.error("Erro ao enviar registro:", error)
    } finally {
      setSending(false)
    }
  }

  const handleExportar = () => {
    const csvContent = [
      ["TAG", "Área", "Contrato", "Modelo", "Nº Série", "Status"].join(","),
      ...machines.map(m => [
        m.tag,
        m.area,
        m.in_contract ? "Sim" : "Não",
        m.model,
        m.serial_number,
        m.status === "operacional" ? "Operacional" : m.status === "parado" ? "Parado" : "Desativado"
      ].join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `registro_semanal_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Registro Semanal</h1>
          <p className="text-muted-foreground">
            Preencha os dados de todas as máquinas semanalmente - Formato planilha
          </p>
        </div>
        <Button onClick={handleEnviarRegistro} disabled={sending}>
          {sending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Enviar Registro Semanal
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por TAG, localização ou modelo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filtros</span>
              </div>
              
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Contrato</span>
                <Select value={filterContrato} onValueChange={setFilterContrato}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Status Operacional</span>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="operacional">Operacional</SelectItem>
                    <SelectItem value="parado">Parado</SelectItem>
                    <SelectItem value="desativado">Desativado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Localização</span>
                <Select value={filterArea} onValueChange={setFilterArea}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {areas.map((area) => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
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
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort('in_contract')}>
                  <div className="flex items-center gap-1">
                    Contrato
                    <ArrowUpDown className={`h-4 w-4 ${sortColumn === 'in_contract' ? 'text-blue-600' : 'text-gray-400'}`} />
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
                    N Serie
                    <ArrowUpDown className={`h-4 w-4 ${sortColumn === 'serial_number' ? 'text-blue-600' : 'text-gray-400'}`} />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort('status')}>
                  <div className="flex items-center gap-1">
                    Status
                    <ArrowUpDown className={`h-4 w-4 ${sortColumn === 'status' ? 'text-blue-600' : 'text-gray-400'}`} />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort('manutencao_preventiva')}>
                  <div className="flex items-center gap-1">
                    Manut. Preventiva
                    <ArrowUpDown className={`h-4 w-4 ${sortColumn === 'manutencao_preventiva' ? 'text-blue-600' : 'text-gray-400'}`} />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort('responsavel')}>
                  <div className="flex items-center gap-1">
                    Responsável
                    <ArrowUpDown className={`h-4 w-4 ${sortColumn === 'responsavel' ? 'text-blue-600' : 'text-gray-400'}`} />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort('acao_responsavel')}>
                  <div className="flex items-center gap-1">
                    Ação Responsável
                    <ArrowUpDown className={`h-4 w-4 ${sortColumn === 'acao_responsavel' ? 'text-blue-600' : 'text-gray-400'}`} />
                  </div>
                </TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMachines.map((machine) => (
                <TableRow key={machine.id}>
                  <TableCell>
                    <div className="flex items-center justify-center">
                      <div className="h-4 w-1 rounded bg-muted" />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{machine.tag}</TableCell>
                  <TableCell>{machine.area}</TableCell>
                  <TableCell>
                    <Badge variant={machine.in_contract ? "default" : "secondary"} className={machine.in_contract ? "bg-blue-500 hover:bg-blue-600" : ""}>
                      {machine.in_contract ? "Sim" : "Não"}
                    </Badge>
                  </TableCell>
                  <TableCell>{machine.model}</TableCell>
                  <TableCell>{machine.serial_number}</TableCell>
                  <TableCell>{getStatusBadge(machine.status)}</TableCell>
                  <TableCell>
                    {(() => {
                      const mp = (machine as any).manutencao_preventiva
                      if (mp === "em_planejamento") return <Badge variant="outline" className="border-amber-500 text-amber-600">Em Planejamento</Badge>
                      if (mp === "em_atraso") return <Badge variant="destructive">Em Atraso</Badge>
                      return <Badge variant="outline" className="border-green-500 text-green-600">OK</Badge>
                    })()}
                  </TableCell>
                  <TableCell>{(machine as any).responsavel || "-"}</TableCell>
                  <TableCell>{(machine as any).acao_responsavel || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(machine)}
                      >
                        <Edit2 className="mr-1 h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(machine)}
                        disabled={deleting === machine.id}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        {deleting === machine.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Footer with Import/Export */}
      <div className="flex items-center gap-4 border-t pt-4">
        <span className="text-sm font-medium text-muted-foreground">Máquinas</span>
        <Button variant="outline" size="sm" disabled>
          <Upload className="mr-2 h-4 w-4" />
          Importar
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportar}>
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </div>

      {/* Edit Machine Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
            <h2 className="text-base font-semibold">Editar Máquina</h2>
            <span className="text-xs text-muted-foreground">
              {editingMachineIndex + 1} de {filteredMachines.length}
            </span>
          </div>

          {/* Machine Info */}
          {editingMachine && (
            <div className="px-6 py-4 border-b bg-white">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">TAG</span>
                  <span className="font-medium">{editingMachine.tag}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Modelo</span>
                  <span className="font-medium">{editingMachine.model}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Localização</span>
                  <span className="font-medium">{editingMachine.area}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Nº Série</span>
                  <span className="font-medium">{editingMachine.serial_number}</span>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <div className="px-6 py-4 space-y-4 max-h-[400px] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Status Operacional *</Label>
                <Select value={editStatus} onValueChange={(v) => setEditStatus(v as any)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operacional">Operacional</SelectItem>
                    <SelectItem value="parado">Parado</SelectItem>
                    <SelectItem value="desativado">Desativado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Manutenção Preventiva *</Label>
                <Select value={editManutencaoPreventiva} onValueChange={(v) => setEditManutencaoPreventiva(v as any)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ok">OK</SelectItem>
                    <SelectItem value="em_planejamento">Em Planejamento</SelectItem>
                    <SelectItem value="em_atraso">Em Atraso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Ação Responsável</Label>
                <Select value={editAcaoResponsavel} onValueChange={(v) => setEditAcaoResponsavel(v as any)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Alumar">Alumar</SelectItem>
                    <SelectItem value="Atlas Copco">Atlas Copco</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Data de Parada</Label>
                <Input
                  type="date"
                  value={editDataParada}
                  onChange={(e) => setEditDataParada(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Tempo de Parada (dias)</Label>
              <Input value={calculateDaysParada()} disabled className="h-9 bg-gray-50" />
              <span className="text-[10px] text-muted-foreground">Calculado automaticamente</span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Responsável</Label>
              <Input
                value={editResponsavel}
                onChange={(e) => setEditResponsavel(e.target.value)}
                placeholder="Nome do responsável..."
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Observações</Label>
              <Textarea
                value={editObservacoes}
                onChange={(e) => setEditObservacoes(e.target.value)}
                placeholder="Descreva observações ou detalhes..."
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-3 border-t bg-gray-50">
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleNavigate("prev")}
                disabled={editingMachineIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleNavigate("next")}
                disabled={editingMachineIndex === filteredMachines.length - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleSaveStatus(false)} disabled={saving}>
                Salvar
              </Button>
              <Button size="sm" onClick={() => handleSaveStatus(true)} disabled={saving} className="bg-green-600 hover:bg-green-700">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar e Próxima"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 rounded-lg bg-[#0099cc] px-4 py-3 text-white shadow-lg">
          <CheckCircle className="h-5 w-5" />
          Registro semanal enviado com sucesso!
        </div>
      )}
    </div>
  )
}
