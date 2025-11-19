"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash2, ChevronDown, ChevronUp } from "lucide-react"
import type { WeeklySnapshot } from "@/lib/types"
import { useState } from "react"

interface HistoryTableProps {
  snapshots: WeeklySnapshot[]
  onDelete: (id: string) => void
}

export function HistoryTable({ snapshots, onDelete }: HistoryTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  if (snapshots.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Registros</CardTitle>
          <CardDescription>Snapshots semanais salvos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            Nenhum registro salvo ainda. Clique em "Salvar Snapshot Semanal" para começar.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Registros</CardTitle>
        <CardDescription>{snapshots.length} snapshots salvos</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Semana</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Operacionais</TableHead>
                <TableHead className="text-center">Paradas</TableHead>
                <TableHead className="text-center">Manutenção</TableHead>
                <TableHead className="text-center">Disponibilidade</TableHead>
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshots.map((snapshot) => (
                <>
                  <TableRow key={snapshot.id}>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => toggleRow(snapshot.id)} className="h-8 w-8 p-0">
                        {expandedRows.has(snapshot.id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{snapshot.semana}</TableCell>
                    <TableCell>{new Date(snapshot.dataRegistro).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-center">{snapshot.stats.total}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {snapshot.stats.operacionais}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        {snapshot.stats.paradas}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        {snapshot.stats.manutencao}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {snapshot.stats.disponibilidade.toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(snapshot.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedRows.has(snapshot.id) && (
                    <TableRow>
                      <TableCell colSpan={9} className="bg-muted/50 p-0">
                        <div className="p-4">
                          {snapshot.machines && snapshot.machines.length > 0 ? (
                            <>
                              <p className="text-sm font-semibold mb-3">
                                Detalhamento - {snapshot.machines.length} máquinas
                              </p>
                              <div className="rounded-md border bg-white">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-blue-600 hover:bg-blue-600">
                                      <TableHead className="text-white font-semibold">TAG</TableHead>
                                      <TableHead className="text-white font-semibold">Modelo</TableHead>
                                      <TableHead className="text-white font-semibold">Localização</TableHead>
                                      <TableHead className="text-white font-semibold">Contrato</TableHead>
                                      <TableHead className="text-white font-semibold">Tipo</TableHead>
                                      <TableHead className="text-white font-semibold">Status</TableHead>
                                      <TableHead className="text-white font-semibold">Preventiva</TableHead>
                                      <TableHead className="text-white font-semibold">Ação</TableHead>
                                      <TableHead className="text-white font-semibold">Observações</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {snapshot.machines.map((machine) => (
                                      <TableRow key={machine.id}>
                                        <TableCell className="font-medium">{machine.nome}</TableCell>
                                        <TableCell>{machine.modelo}</TableCell>
                                        <TableCell>{machine.localizacao}</TableCell>
                                        <TableCell>
                                          <Badge
                                            variant="outline"
                                            className={
                                              machine.temContrato
                                                ? "bg-green-50 text-green-700 border-green-200"
                                                : "bg-red-50 text-red-700 border-red-200"
                                            }
                                          >
                                            {machine.temContrato ? "SIM" : "NÃO"}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          <Badge
                                            variant="outline"
                                            className={
                                              machine.tipo === "Compressor"
                                                ? "bg-orange-50 text-orange-700 border-orange-200"
                                                : "bg-purple-50 text-purple-700 border-purple-200"
                                            }
                                          >
                                            {machine.tipo}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          <Badge
                                            variant="outline"
                                            className={
                                              machine.status === "Operacional"
                                                ? "bg-green-50 text-green-700 border-green-200"
                                                : machine.status === "Parada"
                                                  ? "bg-red-50 text-red-700 border-red-200"
                                                  : "bg-amber-50 text-amber-700 border-amber-200"
                                            }
                                          >
                                            {machine.status}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          <Badge
                                            variant="outline"
                                            className={
                                              machine.preventiva === "OK"
                                                ? "bg-green-50 text-green-700 border-green-200"
                                                : machine.preventiva === "Vencida"
                                                  ? "bg-red-50 text-red-700 border-red-200"
                                                  : "bg-amber-50 text-amber-700 border-amber-200"
                                            }
                                          >
                                            {machine.preventiva}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>{machine.acao}</TableCell>
                                        <TableCell className="max-w-[200px] truncate">
                                          {machine.observacoes || "-"}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-semibold mb-3">Máquinas Paradas:</p>
                              <div className="rounded-md border bg-white">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>TAG</TableHead>
                                      <TableHead>Modelo</TableHead>
                                      <TableHead>Localização</TableHead>
                                      <TableHead>Contrato</TableHead>
                                      <TableHead>Tipo</TableHead>
                                      <TableHead>Status</TableHead>
                                      <TableHead>Preventiva</TableHead>
                                      <TableHead>Ação</TableHead>
                                      <TableHead>Observações</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {snapshot.maquinasParadas.map((machine) => (
                                      <TableRow key={machine.id}>
                                        <TableCell className="font-medium">{machine.nome}</TableCell>
                                        <TableCell>{machine.modelo}</TableCell>
                                        <TableCell>{machine.localizacao}</TableCell>
                                        <TableCell>
                                          <Badge
                                            variant="outline"
                                            className={
                                              machine.temContrato
                                                ? "bg-green-50 text-green-700 border-green-200"
                                                : "bg-red-50 text-red-700 border-red-200"
                                            }
                                          >
                                            {machine.temContrato ? "SIM" : "NÃO"}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          <Badge
                                            variant="outline"
                                            className={
                                              machine.tipo === "Compressor"
                                                ? "bg-orange-50 text-orange-700 border-orange-200"
                                                : "bg-purple-50 text-purple-700 border-purple-200"
                                            }
                                          >
                                            {machine.tipo}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          <Badge
                                            variant="outline"
                                            className={
                                              machine.status === "Operacional"
                                                ? "bg-green-50 text-green-700 border-green-200"
                                                : machine.status === "Parada"
                                                  ? "bg-red-50 text-red-700 border-red-200"
                                                  : "bg-amber-50 text-amber-700 border-amber-200"
                                            }
                                          >
                                            {machine.status}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          <Badge
                                            variant="outline"
                                            className={
                                              machine.preventiva === "OK"
                                                ? "bg-green-50 text-green-700 border-green-200"
                                                : machine.preventiva === "Vencida"
                                                  ? "bg-red-50 text-red-700 border-red-200"
                                                  : "bg-amber-50 text-amber-700 border-amber-200"
                                            }
                                          >
                                            {machine.preventiva}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>{machine.acao}</TableCell>
                                        <TableCell className="max-w-[200px] truncate">
                                          {machine.observacoes || "-"}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
