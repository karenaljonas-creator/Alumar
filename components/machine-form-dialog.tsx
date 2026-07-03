"use client"

import type React from "react"

import { useState, useEffect } from "react"
import type { Machine } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface MachineFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  machine?: Machine
  onSave: (machine: Omit<Machine, "id"> & { id?: string }) => void
}

export function MachineFormDialog({ open, onOpenChange, machine, onSave }: MachineFormDialogProps) {
  const [formData, setFormData] = useState<Omit<Machine, "id"> & { id?: string }>({
    nome: "",
    tipo: "",
    data: new Date().toISOString().slice(0, 7),
    status: "operacional",
    motivoParada: "",
    descricaoDetalhada: "",
    acaoResponsavel: undefined,
    dataParada: undefined,
    statusPreventiva: "OK",
    dataPreventiva: "",
    manutencaoPreventiva: "",
    localizacao: "",
    temContrato: true, // adicionando campo de contrato com valor padrão true
  })

  useEffect(() => {
    if (machine) {
      setFormData(machine)
    } else {
      setFormData({
        nome: "",
        tipo: "",
        data: new Date().toISOString().slice(0, 7),
        status: "operacional",
        motivoParada: "",
        descricaoDetalhada: "",
        acaoResponsavel: undefined,
        dataParada: undefined,
        statusPreventiva: "OK",
        dataPreventiva: "",
        manutencaoPreventiva: "",
        localizacao: "",
        temContrato: true, // adicionando campo de contrato com valor padrão true
      })
    }
  }, [machine, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {machine ? "Editar Máquina" : "Adicionar Nova Máquina"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Máquina *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: BO-501SSA-02"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Máquina *</Label>
              <Input
                id="tipo"
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                placeholder="Ex: Compressor, Soprador"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="localizacao">Localização *</Label>
              <Input
                id="localizacao"
                value={formData.localizacao}
                onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
                placeholder="Ex: Mina de Salobo, Flotação"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="temContrato">Tem Contrato? *</Label>
              <Select
                value={formData.temContrato ? "sim" : "nao"}
                onValueChange={(value) => setFormData({ ...formData, temContrato: value === "sim" })}
              >
                <SelectTrigger id="temContrato">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
              {machine ? "Salvar Alterações" : "Adicionar Máquina"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
