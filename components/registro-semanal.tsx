"use client"

import { useState } from "react"
import type { Machine } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Edit, Send } from "lucide-react"
import { RegistroSemanalModal } from "./registro-semanal-modal"
import { Badge } from "@/components/ui/badge"
import { loadMachines, saveMachines } from "@/lib/supabase-machine-storage"
import { saveWeeklySnapshot } from "@/lib/supabase-history-storage"
import { useToast } from "@/hooks/use-toast"

interface RegistroSemanalProps {
  machines: Machine[]
  onSaveAll: (machines: Machine[]) => void
}

export function RegistroSemanal({ machines, onSaveAll }: RegistroSemanalProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMachineIndex, setSelectedMachineIndex] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const { toast } = useToast()

  const filteredMachines = machines.filter(
    (m) =>
      m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.localizacao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.tipo.toLowerCase().includes(searchTerm.toLowerCase()),
  )

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
      console.log("[v0] Já existe um envio em andamento, ignorando...")
      return
    }

    setIsSending(true)
    console.log("[v0] Iniciando envio do registro semanal...")
    console.log("[v0] Total de máquinas:", machines.length)

    try {
      console.log("[v0] Salvando máquinas no banco...")
      await saveMachines(machines)
      console.log("[v0] Máquinas salvas com sucesso!")

      console.log("[v0] Criando snapshot semanal...")
      const snapshot = await saveWeeklySnapshot(machines)
      console.log("[v0] Snapshot criado:", snapshot)

      toast({
        title: "Registro Semanal Enviado",
        description: `Registro da semana ${snapshot.semana} foi salvo com sucesso e adicionado ao histórico.`,
      })

      console.log("[v0] Recarregando máquinas atualizadas...")
      const updatedMachines = await loadMachines()
      onSaveAll(updatedMachines)
      console.log("[v0] Processo concluído com sucesso!")
    } catch (error) {
      console.error("[v0] Erro ao enviar registro:", error)
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

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold w-[8%] px-2">TAG</TableHead>
                <TableHead className="font-semibold w-[10%] px-2">Localização</TableHead>
                <TableHead className="font-semibold w-[7%] px-2">Contrato</TableHead>
                <TableHead className="font-semibold w-[10%] px-2">Modelo</TableHead>
                <TableHead className="font-semibold w-[10%] px-2">Nº Série</TableHead>
                <TableHead className="font-semibold w-[10%] px-2">Status</TableHead>
                <TableHead className="font-semibold w-[10%] px-2">Preventiva</TableHead>
                <TableHead className="font-semibold w-[12%] px-2">Responsável</TableHead>
                <TableHead className="font-semibold text-center w-[10%] px-2">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMachines.map((machine, index) => (
                <TableRow key={machine.id}>
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
