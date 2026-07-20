"use client"

import type { Machine } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Pencil, Trash2 } from "lucide-react"
import { useAuth } from "@/components/auth-provider"

interface MachineTableProps {
  machines: Machine[]
  onEdit: (machine: Machine) => void
  onDelete: (id: string) => void
}

export function MachineTable({ machines, onEdit, onDelete }: MachineTableProps) {
  const { canEdit } = useAuth()

  if (machines.length === 0) {
    return (
      <Card className="border-border shadow-sm">
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">Nenhuma máquina encontrada</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border shadow-sm">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Máquina</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Tipo</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Localização</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Contrato</th>
                {canEdit && <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {machines.map((machine) => (
                <tr key={machine.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-foreground">{machine.nome}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{machine.tipo}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{machine.localizacao}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{machine.temContrato ? "Sim" : "Não"}</td>
                  {canEdit && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => onEdit(machine)} className="h-8 w-8 p-0">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(machine.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
