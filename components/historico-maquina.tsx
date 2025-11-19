"use client"

import { useState, useMemo } from "react"
import type { Machine } from "@/lib/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { getHistoricoMaquina } from "@/lib/registro-semanal-storage"

interface HistoricoMaquinaProps {
  machines: Machine[]
}

export function HistoricoMaquina({ machines }: HistoricoMaquinaProps) {
  const [selectedMachineId, setSelectedMachineId] = useState<string>("")

  const historico = useMemo(() => {
    if (!selectedMachineId) return []
    return getHistoricoMaquina(selectedMachineId).sort(
      (a, b) => new Date(b.dataRegistro).getTime() - new Date(a.dataRegistro).getTime(),
    )
  }, [selectedMachineId])

  const selectedMachineData = useMemo(() => {
    return historico.map((registro) => {
      const machine = registro.maquinas.find((m) => m.id === selectedMachineId)
      return {
        semana: registro.semana,
        data: new Date(registro.dataRegistro).toLocaleDateString("pt-BR"),
        ...machine,
      }
    })
  }, [historico, selectedMachineId])

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="machine-select" className="text-base font-semibold">
              Selecione uma Máquina
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Escolha uma máquina para ver todo o histórico de registros semanais
            </p>
          </div>
          <Select value={selectedMachineId} onValueChange={setSelectedMachineId}>
            <SelectTrigger id="machine-select" className="w-full">
              <SelectValue placeholder="Selecione uma máquina..." />
            </SelectTrigger>
            <SelectContent>
              {machines.map((machine) => (
                <SelectItem key={machine.id} value={machine.id}>
                  {machine.nome} - {machine.tipo} ({machine.localizacao})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {selectedMachineId && selectedMachineData.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Histórico Completo</h3>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Semana</TableHead>
                  <TableHead>Data Registro</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Preventiva</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedMachineData.map((data, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{data.semana}</TableCell>
                    <TableCell>{data.data}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          data.status === "operacional"
                            ? "default"
                            : data.status === "parada"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {data.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          data.statusPreventiva === "OK"
                            ? "default"
                            : data.statusPreventiva === "Em Atraso"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {data.statusPreventiva || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>{data.localizacao}</TableCell>
                    <TableCell>{data.acaoResponsavel || "-"}</TableCell>
                    <TableCell className="max-w-xs truncate">{data.motivoParada || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {selectedMachineId && selectedMachineData.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Nenhum histórico encontrado para esta máquina.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Comece a registrar dados semanais na aba "Registro Semanal".
          </p>
        </Card>
      )}
    </div>
  )
}
