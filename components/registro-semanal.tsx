"use client"

import type React from "react"

import { useState } from "react"
import type { Machine } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Edit, Send, ArrowUpDown, ArrowUp, ArrowDown, GripVertical } from "lucide-react"
import { RegistroSemanalModal } from "./registro-semanal-modal"
import { Badge } from "@/components/ui/badge"
import { loadMachines, saveMachines } from "@/lib/supabase-machine-storage"
import { saveWeeklySnapshot } from "@/lib/supabase-history-storage"
import { useToast } from "@/hooks/use-toast"

interface RegistroSemanalProps {
  machines: Machine[]
  onSaveAll: (machines: Machine[]) => void
}

type SortColumn = "nome" | "localizacao" | "tipo" | "numeroSerie" | "status" | "statusPreventiva" | "responsavel"
type SortDirection = "asc" | "desc" | null

export function RegistroSemanal({ machines, onSaveAll }: RegistroSemanalProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMachineIndex, setSelectedMachineIndex] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const { toast } = useToast()

  const getSortedMachines = () => {
    const filtered = machines.filter(
      (m) =>
        m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.localizacao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.tipo.toLowerCase().includes(searchTerm.toLowerCase()),
    )

    if (!sortColumn || !sortDirection) {
      return filtered
    }

    return [...filtered].sort((a, b) => {
      let aValue = ""
      let bValue = ""

      switch (sortColumn) {
        case "nome":
          aValue = a.nome || ""
          bValue = b.nome || ""
          break
        case "localizacao":
          aValue = a.localizacao || ""
          bValue = b.localizacao || ""
          break
        case "tipo":
          aValue = a.tipo || ""
          bValue = b.tipo || ""
          break
        case "numeroSerie":
          aValue = a.numeroSerie || ""
          bValue = b.numeroSerie || ""
          break
        case "status":
          aValue = a.status || ""
          bValue = b.status || ""
          break
        case "statusPreventiva":
          aValue = a.statusPreventiva || ""
          bValue = b.statusPreventiva || ""
          break
        case "responsavel":
          aValue = a.responsavel || ""
          bValue = b.responsavel || ""
          break
      }

      const comparison = aValue.localeCompare(bValue, "pt-BR", { sensitivity: "base" })
      return sortDirection === "asc" ? comparison : -comparison
    })
  }

  const filteredMachines = getSortedMachines()

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction or clear
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else if (sortDirection === "desc") {
        setSortColumn(null)
        setSortDirection(null)
      }
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      return
    }

    // Clear any active sorting when manually reordering
    setSortColumn(null)
    setSortDirection(null)

    const newMachines = [...machines]
    const draggedMachine = newMachines[draggedIndex]

    // Remove from old position
    newMachines.splice(draggedIndex, 1)
    // Insert at new position
    newMachines.splice(dropIndex, 0, draggedMachine)

    // Save the new order to database
    try {
      await saveMachines(newMachines)
      onSaveAll(newMachines)
      toast({
        title: "Ordem atualizada",
        description: "A ordem personalizada foi salva com sucesso.",
      })
    } catch (error) {
      console.error("Erro ao salvar ordem:", error)
      toast({
        title: "Erro ao salvar ordem",
        description: "Não foi possível salvar a ordem personalizada.",
        variant: "destructive",
      })
    }

    setDraggedIndex(null)
  }

  const renderSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="h-4 w-4 ml-1" />
    }
    return <ArrowDown className="h-4 w-4 ml-1" />
  }

  const handleEditMachine = (index: number) => {
    setSelectedMachineIndex(index)
    setIsModalOpen(true)
  }

  const handleSaveMachine = async () => {
    setIsModalOpen(false)
    try {
      const updatedMachines = await loadMachines()
      onSaveAll(updatedMachines)
    } catch (error) {
      console.error("Erro ao recarregar máquinas:", error)
    }
  }

  const handleEnviarRegistro = async () => {
    if (isSending) {
      return
    }

    setIsSending(true)

    try {
      await saveMachines(machines)

      const snapshot = await saveWeeklySnapshot(machines)

      toast({
        title: "Registro Semanal Enviado",
        description: `Registro da semana ${snapshot.semana} foi salvo com sucesso e adicionado ao histórico.`,
      })

      const updatedMachines = await loadMachines()
      onSaveAll(updatedMachines)
    } catch (error) {
      console.error("Erro ao enviar registro:", error)
      toast({
        title: "Erro ao enviar registro",
        description: error instanceof Error ? error.message : "Não foi possível salvar os dados. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  const handlePrevious = () => {
    if (selectedMachineIndex !== null && selectedMachineIndex > 0) {
      setSelectedMachineIndex(selectedMachineIndex - 1)
    }
  }

  const handleNext = () => {
    if (selectedMachineIndex !== null && selectedMachineIndex < filteredMachines.length - 1) {
      setSelectedMachineIndex(selectedMachineIndex + 1)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary"> = {
      operacional: "default",
      parada: "destructive",
      manutencao: "secondary",
    }
    return (
      <Badge variant={variants[status] || "default"}>
        {status === "operacional" ? "Operacional" : status === "parada" ? "Parada" : "Manutenção"}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por TAG, localização ou modelo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleEnviarRegistro} className="gap-2 bg-primary" disabled={isSending}>
          <Send className="h-4 w-4" />
          {isSending ? "Enviando..." : "Enviar Registro Semanal"}
        </Button>
      </div>

      {sortColumn && (
        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border">
          Ordenando por{" "}
          <span className="font-semibold">
            {sortColumn === "nome"
              ? "TAG"
              : sortColumn === "localizacao"
                ? "Localização"
                : sortColumn === "tipo"
                  ? "Modelo"
                  : sortColumn === "numeroSerie"
                    ? "Nº Série"
                    : sortColumn === "status"
                      ? "Status"
                      : sortColumn === "statusPreventiva"
                        ? "Preventiva"
                        : "Responsável"}
          </span>{" "}
          ({sortDirection === "asc" ? "A-Z" : "Z-A"}). Clique novamente no cabeçalho para inverter ou limpar a
          ordenação.
        </div>
      )}

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold w-[3%] px-2"></TableHead>
                <TableHead
                  className="font-semibold w-[8%] px-2 cursor-pointer hover:bg-muted/80 select-none"
                  onClick={() => handleSort("nome")}
                >
                  <div className="flex items-center">
                    TAG
                    {renderSortIcon("nome")}
                  </div>
                </TableHead>
                <TableHead
                  className="font-semibold w-[10%] px-2 cursor-pointer hover:bg-muted/80 select-none"
                  onClick={() => handleSort("localizacao")}
                >
                  <div className="flex items-center">
                    Localização
                    {renderSortIcon("localizacao")}
                  </div>
                </TableHead>
                <TableHead className="font-semibold w-[7%] px-2">Contrato</TableHead>
                <TableHead
                  className="font-semibold w-[10%] px-2 cursor-pointer hover:bg-muted/80 select-none"
                  onClick={() => handleSort("tipo")}
                >
                  <div className="flex items-center">
                    Modelo
                    {renderSortIcon("tipo")}
                  </div>
                </TableHead>
                <TableHead
                  className="font-semibold w-[10%] px-2 cursor-pointer hover:bg-muted/80 select-none"
                  onClick={() => handleSort("numeroSerie")}
                >
                  <div className="flex items-center">
                    Nº Série
                    {renderSortIcon("numeroSerie")}
                  </div>
                </TableHead>
                <TableHead
                  className="font-semibold w-[10%] px-2 cursor-pointer hover:bg-muted/80 select-none"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center">
                    Status
                    {renderSortIcon("status")}
                  </div>
                </TableHead>
                <TableHead
                  className="font-semibold w-[10%] px-2 cursor-pointer hover:bg-muted/80 select-none"
                  onClick={() => handleSort("statusPreventiva")}
                >
                  <div className="flex items-center">
                    Preventiva
                    {renderSortIcon("statusPreventiva")}
                  </div>
                </TableHead>
                <TableHead
                  className="font-semibold w-[12%] px-2 cursor-pointer hover:bg-muted/80 select-none"
                  onClick={() => handleSort("responsavel")}
                >
                  <div className="flex items-center">
                    Responsável
                    {renderSortIcon("responsavel")}
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-center w-[10%] px-2">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMachines.map((machine, index) => (
                <TableRow
                  key={machine.id}
                  draggable={!sortColumn}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(index)}
                  className={draggedIndex === index ? "opacity-50" : "cursor-move"}
                >
                  <TableCell className="px-2">
                    {!sortColumn && (
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium px-2">{machine.nome}</TableCell>
                  <TableCell className="px-2">{machine.localizacao}</TableCell>
                  <TableCell className="px-2">
                    <Badge variant={machine.temContrato ? "default" : "secondary"}>
                      {machine.temContrato ? "Sim" : "Não"}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-2">{machine.tipo}</TableCell>
                  <TableCell className="px-2">{machine.numeroSerie || "N/A"}</TableCell>
                  <TableCell className="px-2">{getStatusBadge(machine.status)}</TableCell>
                  <TableCell className="px-2">
                    <Badge
                      variant={
                        machine.statusPreventiva === "OK"
                          ? "default"
                          : machine.statusPreventiva === "Em Atraso"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {machine.statusPreventiva || "OK"}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-2">{machine.responsavel || "-"}</TableCell>
                  <TableCell className="text-center px-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditMachine(index)} className="gap-2">
                      <Edit className="h-4 w-4" />
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Mostrando {filteredMachines.length} de {machines.length} máquinas
        </div>
      </div>

      {selectedMachineIndex !== null && filteredMachines[selectedMachineIndex] && (
        <RegistroSemanalModal
          machine={filteredMachines[selectedMachineIndex]}
          currentIndex={selectedMachineIndex}
          totalMachines={filteredMachines.length}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveMachine}
          onPrevious={handlePrevious}
          onNext={handleNext}
        />
      )}
    </div>
  )
}
