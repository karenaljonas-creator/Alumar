"use client"

import { useState, useEffect } from "react"
import type { Machine } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ChevronLeft, ChevronRight, Save, X } from "@/lib/lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { saveMachines, loadMachines } from "@/lib/supabase-machine-storage"
import { useToast } from "@/hooks/use-toast"

interface RegistroSemanalModalProps {
  machine: Machine
  currentIndex: number
  totalMachines: number
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  onPrevious: () => void
  onNext: () => void
}

export function RegistroSemanalModal({
  machine,
  currentIndex,
  totalMachines,
  isOpen,
  onClose,
  onSave,
  onPrevious,
  onNext,
}: RegistroSemanalModalProps) {
  const [editedMachine, setEditedMachine] = useState<Machine>(machine)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    setEditedMachine(machine)
  }, [machine])

  useEffect(() => {
    if (editedMachine.dataParada) {
      const dataParada = new Date(editedMachine.dataParada)
      const hoje = new Date()
      const diffTime = Math.abs(hoje.getTime() - dataParada.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      setEditedMachine((prev) => ({ ...prev, tempoParada: diffDays }))
    }
  }, [editedMachine.dataParada])

  if (!machine) {
    return null
  }

  const updateField = (field: keyof Machine, value: any) => {
    setEditedMachine((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (isSaving) return
    setIsSaving(true)

    console.log("[v0] handleSave - editedMachine:", { id: editedMachine.id, acaoResponsavel: editedMachine.acaoResponsavel })

    try {
      const allMachines = await loadMachines()
      const updatedMachines = allMachines.map((m) => (m.id === editedMachine.id ? editedMachine : m))

      console.log("[v0] updatedMachine before save:", updatedMachines.find(m => m.id === editedMachine.id)?.acaoResponsavel)

      await saveMachines(updatedMachines)

      toast({
        title: "Máquina salva",
        description: "As alterações foram salvas com sucesso.",
      })

      onSave()
    } catch (error) {
      console.error("Erro ao salvar máquina:", error)
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveAndNext = async () => {
    if (isSaving) return
    setIsSaving(true)

    try {
      const allMachines = await loadMachines()
      const updatedMachines = allMachines.map((m) => (m.id === editedMachine.id ? editedMachine : m))

      await saveMachines(updatedMachines)

      toast({
        title: "Máquina salva",
        description: "As alterações foram salvas com sucesso.",
      })

      if (currentIndex < totalMachines - 1) {
        onNext()
      } else {
        onSave()
      }
    } catch (error) {
      console.error("Erro ao salvar máquina:", error)
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">Registro Semanal - Editar Máquina</DialogTitle>
            <div className="text-sm text-muted-foreground">
              Máquina {currentIndex + 1} de {totalMachines}
            </div>
          </div>
        </DialogHeader>

        <div className="sticky top-0 z-10 bg-card border-b border-border pb-4 mb-4">
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
            <div>
              <div className="text-sm font-medium text-muted-foreground">TAG</div>
              <div className="text-lg font-semibold">{machine.nome}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Modelo</div>
              <div className="text-lg font-semibold">{machine.tipo}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Localização</div>
              <div className="text-lg font-semibold">{machine.localizacao}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Nº Série</div>
              <div className="text-lg font-semibold">{machine.numeroSerie || "N/A"}</div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status Operacional *</Label>
              <Select value={editedMachine.status} onValueChange={(v) => updateField("status", v)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operacional">Operacional</SelectItem>
                  <SelectItem value="parada">Parada</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                  <SelectItem value="v0">V0</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="preventiva">Manutenção Preventiva *</Label>
              <Select
                value={editedMachine.statusPreventiva || "OK"}
                onValueChange={(v) => updateField("statusPreventiva", v)}
              >
                <SelectTrigger id="preventiva">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OK">OK</SelectItem>
                  <SelectItem value="Em Planejamento">Em Planejamento</SelectItem>
                  <SelectItem value="Em Atraso">Em Atraso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contrato">Contrato</Label>
              <Select
                value={editedMachine.temContrato ? "sim" : "nao"}
                onValueChange={(v) => updateField("temContrato", v === "sim")}
              >
                <SelectTrigger id="contrato">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="acao">Ação Responsável</Label>
              <Select
                value={editedMachine.acaoResponsavel || "Vale"}
                onValueChange={(v) => updateField("acaoResponsavel", v)}
              >
                <SelectTrigger id="acao">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vale">Vale</SelectItem>
                  <SelectItem value="Atlas">Atlas</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataParada">Data de Parada</Label>
              <Input
                id="dataParada"
                type="date"
                value={editedMachine.dataParada || ""}
                onChange={(e) => updateField("dataParada", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tempoParada">Tempo de Parada (dias)</Label>
              <Input
                id="tempoParada"
                type="number"
                value={editedMachine.tempoParada || 0}
                readOnly
                disabled
                className="bg-muted cursor-not-allowed"
                placeholder="Calculado automaticamente"
              />
              <p className="text-xs text-muted-foreground">Calculado automaticamente a partir da data de parada</p>
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="responsavel">Responsável</Label>
              <Input
                id="responsavel"
                value={editedMachine.responsavel || ""}
                onChange={(e) => updateField("responsavel", e.target.value)}
                placeholder="Nome do responsável"
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={editedMachine.motivoParada || ""}
                onChange={(e) => updateField("motivoParada", e.target.value)}
                placeholder="Descreva o motivo da parada, observações ou detalhes relevantes..."
                rows={4}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={onPrevious} disabled={currentIndex === 0 || isSaving}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <Button variant="outline" onClick={onNext} disabled={currentIndex === totalMachines - 1 || isSaving}>
              Próxima
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
            <Button variant="secondary" onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-1" />
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
            <Button onClick={handleSaveAndNext} disabled={currentIndex === totalMachines - 1 || isSaving}>
              <Save className="h-4 w-4 mr-1" />
              {isSaving ? "Salvando..." : "Salvar e Próxima"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
