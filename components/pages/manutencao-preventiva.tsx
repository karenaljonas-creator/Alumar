"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Search,
  Filter,
  Upload,
  Download,
  Loader2,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Trash2,
} from "lucide-react"
import { 
  getMachines,
  getPreventiveMaintenances, 
  updatePreventiveMaintenance,
  deletePreventiveMaintenance,
  bulkInsertPreventiveMaintenances,
  clearPreventiveMaintenances,
  type PreventiveMaintenance,
} from "@/lib/supabase/data-service"
import type { Machine } from "@/lib/supabase/database.types"

const MONTHS = [
  { value: 1, label: "Jan", full: "Janeiro" },
  { value: 2, label: "Fev", full: "Fevereiro" },
  { value: 3, label: "Mar", full: "Março" },
  { value: 4, label: "Abr", full: "Abril" },
  { value: 5, label: "Mai", full: "Maio" },
  { value: 6, label: "Jun", full: "Junho" },
  { value: 7, label: "Jul", full: "Julho" },
  { value: 8, label: "Ago", full: "Agosto" },
  { value: 9, label: "Set", full: "Setembro" },
  { value: 10, label: "Out", full: "Outubro" },
  { value: 11, label: "Nov", full: "Novembro" },
  { value: 12, label: "Dez", full: "Dezembro" },
]

const STATUS_COLORS: Record<string, string> = {
  concluido: "bg-green-500 hover:bg-green-600 text-white",
  planejado: "bg-yellow-400 hover:bg-yellow-500 text-black",
  atrasado: "bg-red-500 hover:bg-red-600 text-white",
  pendente: "bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-300",
}

const STATUS_LABELS: Record<string, string> = {
  concluido: "Concluído",
  planejado: "Planejado",
  atrasado: "Atrasado",
  pendente: "Pendente",
}

interface MaintenanceCell {
  id?: string
  machine_id: string | null
  tag: string
  area: string
  model: string
  serial_number: string
  year: number
  month: number
  maintenance_type: string | null
  status: 'pendente' | 'planejado' | 'concluido' | 'atrasado'
  order_number: string | null
}

interface MachineRow {
  machine_id: string | null
  tag: string
  model: string
  serial_number: string
  area: string
  cells: Record<string, MaintenanceCell>
}

// Helper to extract area from tag
function getAreaFromTag(tag: string): string {
  if (tag.startsWith('005A')) return 'Clarificacao'
  if (tag.startsWith('111P')) return 'Porto'
  if (tag.startsWith('045')) return 'Precipitacao'
  if (tag.startsWith('111S') || tag.startsWith('112S')) return 'Reducao'
  if (tag.startsWith('111R') || tag.startsWith('110F') || tag.startsWith('110G') || tag.startsWith('110X')) return 'Refinaria'
  return 'Outros'
}

export function ManutencaoPreventiva() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [maintenances, setMaintenances] = useState<PreventiveMaintenance[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterArea, setFilterArea] = useState("all")
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  
  // Edit dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCell, setEditingCell] = useState<MaintenanceCell | null>(null)
  const [editStatus, setEditStatus] = useState<'pendente' | 'planejado' | 'concluido' | 'atrasado'>('pendente')
  const [editOrderNumber, setEditOrderNumber] = useState("")
  const [editMaintenanceType, setEditMaintenanceType] = useState("")
  const [editObservations, setEditObservations] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Import
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  // Sorting
  const [sortColumn, setSortColumn] = useState<'tag' | 'model' | 'serial_number' | 'area' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Years available
  const years = [2024, 2025, 2026, 2027]

  useEffect(() => {
    loadData()
  }, [selectedYear])

  const loadData = async () => {
    setLoading(true)
    try {
      const [machinesData, maintenancesData] = await Promise.all([
        getMachines(),
        getPreventiveMaintenances(selectedYear),
      ])
      setMachines(machinesData)
      setMaintenances(maintenancesData)
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
    } finally {
      setLoading(false)
    }
  }

  // Filtrar apenas máquinas com contrato (in_contract = true)
  const machinesWithContract = machines.filter(m => m.in_contract)
  
  const areas = [...new Set(machinesWithContract.map((m) => m.area))].filter(Boolean).sort()

  // Build machine rows from machines table (fonte única) + maintenance data
  const machineRows: MachineRow[] = machinesWithContract
    .map((machine) => {
      const machineMaintenances = maintenances.filter(m => m.tag === machine.tag)
      
      const cells: Record<string, MaintenanceCell> = {}
      
      // Initialize all months
      for (let month = 1; month <= 12; month++) {
        const key = `${selectedYear}-${month}`
        const maintenance = machineMaintenances.find(
          (m) => m.year === selectedYear && m.month === month
        )
        
        cells[key] = {
          id: maintenance?.id,
          machine_id: machine.id,
          tag: machine.tag,
          area: machine.area,
          model: machine.model,
          serial_number: machine.serial_number,
          year: selectedYear,
          month,
          maintenance_type: maintenance?.maintenance_type || null,
          status: maintenance?.status || 'pendente',
          order_number: maintenance?.order_number || null,
        }
      }
      
      return {
        machine_id: machine.id,
        tag: machine.tag,
        model: machine.model,
        serial_number: machine.serial_number,
        area: machine.area,
        cells,
      }
    })
    .filter((row) => {
      const matchesSearch =
        row.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.serial_number.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesArea = filterArea === "all" || row.area === filterArea
      return matchesSearch && matchesArea
    })
    .sort((a, b) => {
      // If a sort column is selected, sort by that column
      if (sortColumn) {
        const aValue = a[sortColumn]?.toLowerCase() || ''
        const bValue = b[sortColumn]?.toLowerCase() || ''
        const compare = aValue.localeCompare(bValue)
        return sortDirection === 'asc' ? compare : -compare
      }
      // Default: Sort by area, then by tag
      const areaCompare = a.area.localeCompare(b.area)
      if (areaCompare !== 0) return areaCompare
      return a.tag.localeCompare(b.tag)
    })

  const toggleSort = (column: 'tag' | 'model' | 'serial_number' | 'area') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const openEditDialog = (cell: MaintenanceCell) => {
    setEditingCell(cell)
    setEditStatus(cell.status)
    setEditOrderNumber(cell.order_number || "")
    setEditMaintenanceType(cell.maintenance_type || "")
    setEditObservations("")
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!editingCell) return

    setSaving(true)
    try {
      if (editingCell.id) {
        // Update existing
        await updatePreventiveMaintenance(editingCell.id, {
          status: editStatus,
          order_number: editOrderNumber || null,
          maintenance_type: editMaintenanceType || null,
        })
      } else {
        // Create new
        await bulkInsertPreventiveMaintenances([{
          machine_id: editingCell.machine_id,
          tag: editingCell.tag,
          area: editingCell.area,
          model: editingCell.model,
          serial_number: editingCell.serial_number,
          year: editingCell.year,
          month: editingCell.month,
          maintenance_type: editMaintenanceType || null,
          status: editStatus,
          order_number: editOrderNumber || null,
          observations: null,
        }])
      }
      
      await loadData()
      setIsDialogOpen(false)
    } catch (error) {
      console.error("Erro ao salvar:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingCell?.id) return
    
    if (!confirm(`Tem certeza que deseja excluir este registro?`)) return
    
    setDeleting(true)
    try {
      await deletePreventiveMaintenance(editingCell.id)
      await loadData()
      setIsDialogOpen(false)
    } catch (error) {
      console.error("Erro ao deletar:", error)
      alert("Erro ao deletar registro. Tente novamente.")
    } finally {
      setDeleting(false)
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      // Parse CSV - expected format: TAG,ANO,MES,TIPO,STATUS,OS
      const records: Omit<PreventiveMaintenance, "id" | "created_at" | "updated_at">[] = []
      
      // Skip header
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''))
        if (cols.length >= 4) {
          const tag = cols[0]
          const year = parseInt(cols[1])
          const month = parseInt(cols[2])
          const maintenanceType = cols[3] || null
          const status = (cols[4]?.toLowerCase() || 'pendente') as 'pendente' | 'planejado' | 'concluido' | 'atrasado'
          const orderNumber = cols[5] || null
          
          // Find machine_id by tag
          const machine = machines.find(m => m.tag === tag)
          
          if (tag && !isNaN(year) && !isNaN(month)) {
            records.push({
              machine_id: machine?.id || null,
              tag,
              area: machine?.area || "",
              model: machine?.model || "",
              serial_number: machine?.serial_number || "",
              year,
              month,
              maintenance_type: maintenanceType,
              status: ['pendente', 'planejado', 'concluido', 'atrasado'].includes(status) ? status : 'pendente',
              order_number: orderNumber,
              observations: null,
            })
          }
        }
      }

      if (records.length > 0) {
        await clearPreventiveMaintenances()
        await bulkInsertPreventiveMaintenances(records)
        await loadData()
        setSuccessMessage(`${records.length} registros importados com sucesso!`)
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)
      }
    } catch (error) {
      console.error("Erro ao importar:", error)
      alert("Erro ao importar arquivo. Verifique o formato do CSV.")
    } finally {
      setImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleExport = () => {
    const csvLines = ["TAG,ANO,MES,TIPO,STATUS,OS"]
    
    for (const maintenance of maintenances) {
      csvLines.push([
        maintenance.tag,
        maintenance.year,
        maintenance.month,
        maintenance.maintenance_type || "",
        maintenance.status,
        maintenance.order_number || "",
      ].join(","))
    }

    const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `manutencao_preventiva_${selectedYear}.csv`
    link.click()
  }

  const getCellDisplay = (cell: MaintenanceCell) => {
    if (!cell.maintenance_type && cell.status === 'pendente') {
      return null // Empty cell
    }
    return cell.maintenance_type || ""
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
          <h1 className="text-2xl font-bold">Manutenção Preventiva</h1>
          <p className="text-muted-foreground">
            Cronograma de manutenções preventivas por máquina
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".csv"
            className="hidden"
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Importar CSV
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por TAG, modelo ou série..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedYear(y => Math.max(2024, y - 1))}
                  disabled={selectedYear <= 2024}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedYear(y => Math.min(2027, y + 1))}
                  disabled={selectedYear >= 2027}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filtros</span>
              </div>
              
              <Select value={filterArea} onValueChange={setFilterArea}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Área" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Áreas</SelectItem>
                  {areas.map((area) => (
                    <SelectItem key={area} value={area}>
                      {area}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Legend */}
              <div className="ml-auto flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="h-4 w-4 rounded bg-green-500"></div>
                  <span>Concluído</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-4 w-4 rounded bg-yellow-400"></div>
                  <span>Planejado</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-4 w-4 rounded bg-red-500"></div>
                  <span>Atrasado</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-4 w-4 rounded border border-gray-300 bg-gray-100"></div>
                  <span>Pendente</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cronograma Grid */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th 
                  className="sticky left-0 bg-gray-50 px-3 py-3 text-left font-medium min-w-[120px] z-10 cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('tag')}
                >
                  <div className="flex items-center gap-1">
                    TAG
                    <ArrowUpDown className={`h-4 w-4 ${sortColumn === 'tag' ? 'text-blue-600' : 'text-gray-400'}`} />
                  </div>
                </th>
                <th 
                  className="px-3 py-3 text-left font-medium min-w-[100px] cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('model')}
                >
                  <div className="flex items-center gap-1">
                    Modelo
                    <ArrowUpDown className={`h-4 w-4 ${sortColumn === 'model' ? 'text-blue-600' : 'text-gray-400'}`} />
                  </div>
                </th>
                <th 
                  className="px-3 py-3 text-left font-medium min-w-[100px] cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('serial_number')}
                >
                  <div className="flex items-center gap-1">
                    N Serie
                    <ArrowUpDown className={`h-4 w-4 ${sortColumn === 'serial_number' ? 'text-blue-600' : 'text-gray-400'}`} />
                  </div>
                </th>
                <th 
                  className="px-3 py-3 text-left font-medium min-w-[100px] cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('area')}
                >
                  <div className="flex items-center gap-1">
                    Area
                    <ArrowUpDown className={`h-4 w-4 ${sortColumn === 'area' ? 'text-blue-600' : 'text-gray-400'}`} />
                  </div>
                </th>
                {MONTHS.map((month) => (
                  <th key={month.value} className="px-1 py-3 text-center font-medium min-w-[50px]">
                    {month.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {machineRows.map((row) => (
                <tr key={row.tag} className="border-b hover:bg-gray-50">
                  <td className="sticky left-0 bg-white px-3 py-2 font-medium z-10">{row.tag}</td>
                  <td className="px-3 py-2 text-gray-600 text-xs">{row.model}</td>
                  <td className="px-3 py-2 text-gray-600 text-xs">{row.serial_number}</td>
                  <td className="px-3 py-2 text-gray-600">{row.area}</td>
                  {MONTHS.map((month) => {
                    const cell = row.cells[`${selectedYear}-${month.value}`]
                    const display = getCellDisplay(cell)
                    
                    return (
                      <td key={month.value} className="px-1 py-1 text-center">
                        <button
                          onClick={() => openEditDialog(cell)}
                          className={`w-full min-h-[32px] rounded text-xs font-medium transition-colors ${STATUS_COLORS[cell.status]}`}
                        >
                          {display}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <span><strong>{machineRows.length}</strong> máquinas</span>
        <span><strong>{maintenances.filter(m => m.status === 'concluido').length}</strong> concluídas</span>
        <span><strong>{maintenances.filter(m => m.status === 'planejado').length}</strong> planejadas</span>
        <span><strong>{maintenances.filter(m => m.status === 'atrasado').length}</strong> atrasadas</span>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Editar Manutenção</DialogTitle>
          </DialogHeader>
          
          {editingCell && (
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block">TAG</span>
                    <span className="font-medium">{editingCell.tag}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Período</span>
                    <span className="font-medium">
                      {MONTHS.find(m => m.value === editingCell.month)?.full} / {editingCell.year}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Manutenção</Label>
                <Select value={editMaintenanceType} onValueChange={setEditMaintenanceType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A - Preventiva A</SelectItem>
                    <SelectItem value="B">B - Preventiva B</SelectItem>
                    <SelectItem value="C">C - Preventiva C</SelectItem>
                    <SelectItem value="D">D - Preventiva D</SelectItem>
                    <SelectItem value="I">I - Inspeção</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editStatus} onValueChange={(v) => setEditStatus(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="planejado">Planejado</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="atrasado">Atrasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Número da O.S.</Label>
                <Input
                  value={editOrderNumber}
                  onChange={(e) => setEditOrderNumber(e.target.value)}
                  placeholder="Ex: OS-12345"
                />
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <textarea
                  value={editObservations}
                  onChange={(e) => setEditObservations(e.target.value)}
                  placeholder="Adicione observações ou justificativas..."
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] font-sans resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={handleDelete} 
              disabled={deleting || !editingCell?.id}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Excluir
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Salvar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-white shadow-lg">
          <CheckCircle className="h-5 w-5" />
          {successMessage}
        </div>
      )}
    </div>
  )
}
