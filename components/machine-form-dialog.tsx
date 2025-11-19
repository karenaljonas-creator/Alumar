"use client"

import type React from "react"

import { useState, useEffect } from "react"
import type { Machine, MachineStatus, AcaoResponsavel, StatusPreventiva } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

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
              <Label htmlFor="data">Data/Mês *</Label>
              <Input
                id="data"
                type="month"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status Operacional *</Label>
              <Select
                value={formData.status}
                onValueChange={(value: MachineStatus) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operacional">Operacional</SelectItem>
                  <SelectItem value="parada">Parada</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                </SelectContent>
              </Select>
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

            {formData.status === "parada" && (
              <div className="space-y-2">
                <Label htmlFor="dataParada">Data da Parada</Label>
                <Input
                  id="dataParada"
                  type="date"
                  value={formData.dataParada}
                  onChange={(e) => setFormData({ ...formData, dataParada: e.target.value })}
                />
              </div>
            )}

            {formData.status === "parada" && (
              <div className="space-y-2">
                <Label htmlFor="acaoResponsavel">Ação Responsável</Label>
                <Select
                  value={formData.acaoResponsavel}
                  onValueChange={(value: AcaoResponsavel) => setFormData({ ...formData, acaoResponsavel: value })}
                >
                  <SelectTrigger id="acaoResponsavel">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Vale">Ação Vale</SelectItem>
                    <SelectItem value="Atlas">Ação Atlas</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="statusPreventiva">Status Preventiva</Label>
              <Select
                value={formData.statusPreventiva}
                onValueChange={(value: StatusPreventiva) => setFormData({ ...formData, statusPreventiva: value })}
              >
                <SelectTrigger id="statusPreventiva">
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
              <Label htmlFor="dataPreventiva">Data Preventiva</Label>
              <Input
                id="dataPreventiva"
                type="date"
                value={formData.dataPreventiva}
                onChange={(e) => setFormData({ ...formData, dataPreventiva: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivoParada">Motivo da Parada</Label>
            <Textarea
              id="motivoParada"
              value={formData.motivoParada}
              onChange={(e) => setFormData({ ...formData, motivoParada: e.target.value })}
              placeholder="Resumo do motivo da parada"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricaoDetalhada">Descrição Detalhada</Label>
            <Textarea
              id="descricaoDetalhada"
              value={formData.descricaoDetalhada}
              onChange={(e) => setFormData({ ...formData, descricaoDetalhada: e.target.value })}
              placeholder="Descrição completa do problema, ações tomadas, peças necessárias, etc."
              rows={4}
            />
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
