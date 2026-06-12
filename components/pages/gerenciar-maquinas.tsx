"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Search, Plus, Pencil, Trash2, Filter, Loader2 } from "lucide-react"
import { getMachines, createMachine, updateMachine, deleteMachine } from "@/lib/supabase/data-service"
import type { Machine } from "@/lib/supabase/database.types"

export function GerenciarMaquinas() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [areaFilter, setAreaFilter] = useState<string>("all")
  const [contractFilter, setContractFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null)
  const [machineToDelete, setMachineToDelete] = useState<Machine | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    model: "",
    area: "",
    serial_number: "",
    tag: "",
    in_contract: true,
  })

  useEffect(() => {
    loadMachines()
  }, [])

  async function loadMachines() {
    try {
      setLoading(true)
      const data = await getMachines()
      setMachines(data)
    } catch (error) {
      console.error("Erro ao carregar máquinas:", error)
    } finally {
      setLoading(false)
    }
  }

  const areas = [...new Set(machines.map(m => m.area))].sort()

  const filteredMachines = machines.filter((machine) => {
    const matchesSearch =
      machine.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      machine.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      machine.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      machine.area.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesArea = areaFilter === "all" || machine.area === areaFilter
    const matchesContract =
      contractFilter === "all" ||
      (contractFilter === "sim" && machine.in_contract) ||
      (contractFilter === "nao" && !machine.in_contract)

    return matchesSearch && matchesArea && matchesContract
  })

  const stats = {
    total: machines.length,
    inContract: machines.filter(m => m.in_contract).length,
    outOfContract: machines.filter(m => !m.in_contract).length,
  }

  const openAddDialog = () => {
    setEditingMachine(null)
    setFormData({
      name: "",
      model: "",
      area: "",
      serial_number: "",
      tag: "",
      in_contract: true,
    })
    setIsDialogOpen(true)
  }

  const openEditDialog = (machine: Machine) => {
    setEditingMachine(machine)
    setFormData({
      name: machine.name,
      model: machine.model,
      area: machine.area,
      serial_number: machine.serial_number,
      tag: machine.tag,
      in_contract: machine.in_contract,
    })
    setIsDialogOpen(true)
  }

  const openDeleteDialog = (machine: Machine) => {
    setMachineToDelete(machine)
    setIsDeleteDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.model || !formData.area || !formData.serial_number || !formData.tag) {
      return
    }

    setSaving(true)
    try {
      if (editingMachine) {
        await updateMachine(editingMachine.id, formData)
      } else {
        await createMachine({
          ...formData,
          name: formData.name || `Compressor ${formData.model}`,
          status: "operando",
          hours_worked: 0,
          hours_available: 500,
          next_maintenance: null,
          last_maintenance: null,
          maintenance_interval: 500,
        })
      }
      await loadMachines()
      setIsDialogOpen(false)
    } catch (error) {
      console.error("Erro ao salvar máquina:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!machineToDelete) return

    try {
      await deleteMachine(machineToDelete.id)
      await loadMachines()
      setIsDeleteDialogOpen(false)
      setMachineToDelete(null)
    } catch (error) {
      console.error("Erro ao excluir máquina:", error)
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
    <div className="flex flex-col gap-6 p-6 bg-white min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gerenciar Equipamentos</h1>
          <p className="text-muted-foreground">Cadastre e edite os dados dos equipamentos</p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Equipamento
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Em Contrato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.inContract}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Fora Contrato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.outOfContract}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por TAG, Nº de série, modelo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={areaFilter} onValueChange={setAreaFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Todas as Áreas" />
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
              <Select value={contractFilter} onValueChange={setContractFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Contrato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="sim">Em Contrato</SelectItem>
                  <SelectItem value="nao">Fora Contrato</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table - SEM Status e Progresso PM */}
      <Card>
        <CardHeader>
          <CardTitle>Equipamentos ({filteredMachines.length} de {machines.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Área</TableHead>
                <TableHead>Equipamento</TableHead>
                <TableHead>Nº de Série</TableHead>
                <TableHead>TAG</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMachines.map((machine) => (
                <TableRow key={machine.id}>
                  <TableCell className="font-medium">{machine.area}</TableCell>
                  <TableCell>{machine.model}</TableCell>
                  <TableCell>{machine.serial_number}</TableCell>
                  <TableCell>{machine.tag}</TableCell>
                  <TableCell>
                    <Badge variant={machine.in_contract ? "default" : "secondary"}>
                      {machine.in_contract ? "SIM" : "NÃO"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(machine)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(machine)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog - SEM Status e Horas */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMachine ? "Editar Equipamento" : "Adicionar Equipamento"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="area">Área</Label>
              <Input
                id="area"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                placeholder="Ex: Refinaria, Reducao, Porto..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="model">Equipamento/Modelo</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="Ex: ZR6, GA110, FD4000 VSD..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="serial_number">Nº de Série</Label>
              <Input
                id="serial_number"
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                placeholder="Ex: 487164, AIF116654..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tag">TAG</Label>
              <Input
                id="tag"
                value={formData.tag}
                onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                placeholder="Ex: 111R-CP11, DESATIVADO..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contract">Em Contrato</Label>
              <Select
                value={formData.in_contract ? "sim" : "nao"}
                onValueChange={(v) => setFormData({ ...formData, in_contract: v === "sim" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">SIM</SelectItem>
                  <SelectItem value="nao">NÃO</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingMachine ? "Salvar Alterações" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o equipamento{" "}
              <strong>{machineToDelete?.tag}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
