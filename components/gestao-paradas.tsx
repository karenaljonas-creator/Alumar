"use client"

import { useState, useMemo, useCallback } from "react"
import type { Machine } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, AlertTriangle, ArrowUp, ArrowDown, ArrowUpDown, Check, X, Edit2, ChevronDown, Calendar as CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { pt } from "date-fns/locale"
import { saveMachines } from "@/lib/supabase-machine-storage"
import { useToast } from "@/hooks/use-toast"

type SortKey = "nome" | "tipo" | "localizacao" | "contrato" | "tipoEquip" | "status" | "dataParada" | "diasParada" | "prazo" | "dataAtualizacao" | "acao" | "responsavel" | "observacoes"
type SortDirection = "asc" | "desc"

interface GestaoParadasProps {
  machines: Machine[]
  onUpdate?: (updatedMachines: Machine[]) => void
}

interface EditingState {
  machineId: string
  field: string
  value: string
}

export function GestaoParadas({ machines, onUpdate }: GestaoParadasProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [contratoFilter, setContratoFilter] = useState("todos")
  const [acaoFilter, setAcaoFilter] = useState("todos")
  const [localizacaoFilter, setLocalizacaoFilter] = useState("todas")
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [editingState, setEditingState] = useState<EditingState | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [visibleFields, setVisibleFields] = useState({ contrato: false, dataParada: false, tempoParada: false })
  const [expandedLabels, setExpandedLabels] = useState({ contrato: false, dataParada: false, tempoParada: false })
  const [openDatePicker, setOpenDatePicker] = useState<string | null>(null)
  const { toast } = useToast()

  const handleEditStart = (machineId: string, field: string, value: string) => {
    setEditingState({ machineId, field, value })
  }

  const handleEditSave = async (machineId: string) => {
    if (!editingState || editingState.machineId !== machineId) return

    setIsSaving(true)
    try {
      // Atualizar a máquina com o novo valor
      const updatedMachines = machines.map((m) => {
        if (m.id === machineId) {
          const updated = { ...m }
          
          if (editingState.field === "prazo") {
            // Salvar em um campo separado prazoDados (não depende de contratoConfig)
            updated.prazoDados = editingState.value
          } else if (editingState.field === "motivoParada") {
            updated.motivoParada = editingState.value
          } else if (editingState.field === "responsavel") {
            updated.responsavel = editingState.value
          } else if (editingState.field === "acaoResponsavel") {
            updated.acaoResponsavel = editingState.value
          }
          
          updated.updated_at = new Date().toISOString()
          return updated
        }
        return m
      })

      // Salvar no Supabase
      await saveMachines(updatedMachines)
      
      // Notificar componente pai para sincronizar
      if (onUpdate) {
        onUpdate(updatedMachines)
      }
      
      setEditingState(null)
      toast({ title: "Sucesso!", description: "Alteração salva com sucesso" })
    } catch (error) {
      toast({ 
        title: "Erro ao salvar", 
        description: "Houve um erro ao salvar a alteração",
        variant: "destructive"
      })
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditCancel = () => {
    setEditingState(null)
  }

  const isEditing = (machineId: string, field: string) => {
    return editingState?.machineId === machineId && editingState?.field === field
  }

  // Compute filtered and sorted machines
  const filteredMachines = useMemo(() => {
    let result = machines.filter((m) => m.status === "parada")

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (m) =>
          m.tag?.toLowerCase().includes(term) ||
          m.tipo?.toLowerCase().includes(term) ||
          m.responsavel?.toLowerCase().includes(term)
      )
    }

    // Contrato filter
    if (contratoFilter !== "todos") {
      result = result.filter((m) =>
        contratoFilter === "sim" ? m.temContrato : !m.temContrato
      )
    }

    // Acao filter
    if (acaoFilter !== "todos") {
      result = result.filter((m) => m.acaoResponsavel === acaoFilter)
    }

    // Localizacao filter
    if (localizacaoFilter !== "todas") {
      result = result.filter((m) => m.localizacao === localizacaoFilter)
    }

    // Sort
    if (sortKey) {
      result.sort((a, b) => {
        let aVal: any = a[sortKey as keyof typeof a]
        let bVal: any = b[sortKey as keyof typeof b]

        if (aVal === undefined || aVal === null) aVal = ""
        if (bVal === undefined || bVal === null) bVal = ""

        if (typeof aVal === "string" && typeof bVal === "string") {
          const comparison = aVal.localeCompare(bVal)
          return sortDirection === "asc" ? comparison : -comparison
        }

        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1
        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1
        return 0
      })
    }

    return result
  }, [machines, searchTerm, contratoFilter, acaoFilter, localizacaoFilter, sortKey, sortDirection])

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-"
    try {
      // Validar se é uma data válida
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return "-"
      return date.toLocaleDateString("pt-BR")
    } catch {
      return "-"
    }
  }

  const getDiasParadaNum = (dateStr?: string) => {
    if (!dateStr) return 0
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return 0
      const today = new Date()
      const diffTime = Math.abs(today.getTime() - date.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays
    } catch {
      return 0
    }
  }

  // Unique values for filters
  const acoes = useMemo(
    () => [...new Set(machines.map((m) => m.acaoResponsavel).filter(Boolean))],
    [machines]
  )

  const localizacoes = useMemo(
    () => [...new Set(machines.map((m) => m.localizacao).filter(Boolean))],
    [machines]
  )

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortKey !== columnKey) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <CardTitle className="text-lg">
                  Maquinas Paradas - {filteredMachines.length} equipamento{filteredMachines.length !== 1 ? "s" : ""}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Dados do registro atual - Atualizado em{" "}
                  {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>
            <Badge variant="destructive" className="text-base px-3 py-1">
                      {filteredMachines.length} parada{filteredMachines.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 overflow-hidden">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por TAG, modelo ou responsavel..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Contrato</label>
              <Select value={contratoFilter} onValueChange={setContratoFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Nao</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Acao Responsavel</label>
              <Select value={acaoFilter} onValueChange={setAcaoFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {acoes.map((acao) => (
                    <SelectItem key={acao} value={acao!}>
                      {acao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Localizacao</label>
              <Select value={localizacaoFilter} onValueChange={setLocalizacaoFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {localizacoes.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="w-full overflow-x-auto rounded-lg border border-border">
            <Table className="w-full border-collapse">
                <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead className="w-[14%]">
                    <button onClick={() => handleSort("tipo")} className="flex items-center font-medium hover:text-foreground transition-colors cursor-pointer">
                      Modelo <SortIcon columnKey="tipo" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[12%]">
                    <button onClick={() => handleSort("localizacao")} className="flex items-center font-medium hover:text-foreground transition-colors cursor-pointer">
                      Localizacao <SortIcon columnKey="localizacao" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[10%]">
                    <button onClick={() => handleSort("status")} className="flex items-center font-medium hover:text-foreground transition-colors cursor-pointer">
                      Status <SortIcon columnKey="status" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[28%] min-w-[400px]">
                    <button onClick={() => handleSort("observacoes")} className="flex items-center font-medium hover:text-foreground transition-colors cursor-pointer">
                      Observacoes <SortIcon columnKey="observacoes" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[10%]">
                    <button onClick={() => handleSort("prazo")} className="flex items-center font-medium hover:text-foreground transition-colors cursor-pointer">
                      Prazo <SortIcon columnKey="prazo" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[10%]">
                    <button onClick={() => handleSort("acao")} className="flex items-center font-medium hover:text-foreground transition-colors cursor-pointer">
                      Acao <SortIcon columnKey="acao" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[12%]">
                    <button onClick={() => handleSort("responsavel")} className="flex items-center font-medium hover:text-foreground transition-colors cursor-pointer">
                      Responsavel <SortIcon columnKey="responsavel" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[10%]">
                    <button onClick={() => handleSort("dataAtualizacao")} className="flex items-center font-medium hover:text-foreground transition-colors cursor-pointer">
                      Atualizado em <SortIcon columnKey="dataAtualizacao" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[10%] min-w-[80px] text-center">
                    <button 
                      onClick={() => {
                        setVisibleFields(prev => ({ ...prev, contrato: !prev.contrato }))
                        setExpandedLabels(prev => ({ ...prev, contrato: !prev.contrato }))
                      }}
                      className="flex items-center justify-center font-medium hover:text-foreground transition-all cursor-pointer w-full gap-1 whitespace-nowrap px-2"
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform flex-shrink-0 ${expandedLabels.contrato ? 'rotate-180' : ''}`} />
                      {expandedLabels.contrato && <span className="text-xs">Contrato</span>}
                    </button>
                  </TableHead>
                  <TableHead className="w-[10%] min-w-[80px] text-center">
                    <button 
                      onClick={() => {
                        setVisibleFields(prev => ({ ...prev, dataParada: !prev.dataParada }))
                        setExpandedLabels(prev => ({ ...prev, dataParada: !prev.dataParada }))
                      }}
                      className="flex items-center justify-center font-medium hover:text-foreground transition-all cursor-pointer w-full gap-1 whitespace-nowrap px-2"
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform flex-shrink-0 ${expandedLabels.dataParada ? 'rotate-180' : ''}`} />
                      {expandedLabels.dataParada && <span className="text-xs">Data de Parada</span>}
                    </button>
                  </TableHead>
                  <TableHead className="w-[10%] min-w-[80px] text-center">
                    <button 
                      onClick={() => {
                        setVisibleFields(prev => ({ ...prev, tempoParada: !prev.tempoParada }))
                        setExpandedLabels(prev => ({ ...prev, tempoParada: !prev.tempoParada }))
                      }}
                      className="flex items-center justify-center font-medium hover:text-foreground transition-all cursor-pointer w-full gap-1 whitespace-nowrap px-2"
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform flex-shrink-0 ${expandedLabels.tempoParada ? 'rotate-180' : ''}`} />
                      {expandedLabels.tempoParada && <span className="text-xs">Tempo de Parada</span>}
                    </button>
                  </TableHead>
                  <TableHead className="w-[6%] text-center">
                    <span className="font-medium">Editar</span>
                  </TableHead>
                  {visibleFields.contrato && (
                    <TableHead className="w-[10%] min-w-[80px]">
                      <span className="font-medium">Contrato</span>
                    </TableHead>
                  )}
                  {visibleFields.dataParada && (
                    <TableHead className="w-[10%] min-w-[80px]">
                      <span className="font-medium">Data de Parada</span>
                    </TableHead>
                  )}
                  {visibleFields.tempoParada && (
                    <TableHead className="w-[10%] min-w-[80px]">
                      <span className="font-medium">Tempo de Parada</span>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMachines.length > 0 ? (
                  filteredMachines.map((maquina) => (
                    <TableRow key={maquina.id} className="group border-b">
                      <TableCell className="text-sm py-3 px-4 align-middle">{maquina.tipo}</TableCell>
                      <TableCell className="text-sm py-3 px-4 align-middle">{maquina.localizacao}</TableCell>
                      <TableCell className="py-3 px-4 align-middle">
                        <Badge
                          variant={maquina.status === "parada" ? "destructive" : "secondary"}
                          className={
                            maquina.status === "v0"
                              ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                              : ""
                          }
                        >
                          {maquina.status === "parada" ? "Parada" : "V0"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm py-3 px-4 align-middle whitespace-normal break-words max-w-[400px]">
                        {isEditing(maquina.id, "motivoParada") ? (
                          <div className="flex gap-2 items-center">
                            <Input
                              value={editingState?.value || ""}
                              onChange={(e) =>
                                setEditingState((prev) =>
                                  prev ? { ...prev, value: e.target.value } : null
                                )
                              }
                              className="h-8 text-xs flex-1"
                              placeholder="Digite a observação"
                              disabled={isSaving}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditSave(maquina.id)}
                              className="h-8 w-8 p-0 flex-shrink-0"
                              disabled={isSaving}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleEditCancel}
                              className="h-8 w-8 p-0 flex-shrink-0"
                              disabled={isSaving}
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:bg-muted p-2 rounded transition-colors"
                            onClick={() =>
                              handleEditStart(
                                maquina.id,
                                "motivoParada",
                                maquina.motivoParada || ""
                              )
                            }
                          >
                            <span className="text-xs leading-relaxed flex-1">{maquina.motivoParada || "-"}</span>
                            <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm py-3 px-4 align-middle">
                        {isEditing(maquina.id, "prazo") ? (
                          <div className="flex gap-2 items-center">
                            <Input
                              value={editingState?.value || ""}
                              onChange={(e) =>
                                setEditingState((prev) =>
                                  prev ? { ...prev, value: e.target.value } : null
                                )
                              }
                              className="h-8 text-xs flex-1"
                              placeholder="DD/MM/YYYY"
                              disabled={isSaving}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditSave(maquina.id)}
                              className="h-8 w-8 p-0 flex-shrink-0"
                              disabled={isSaving}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleEditCancel}
                              className="h-8 w-8 p-0 flex-shrink-0"
                              disabled={isSaving}
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:bg-muted p-2 rounded transition-colors"
                            onClick={() =>
                              handleEditStart(maquina.id, "prazo", maquina.prazoDados || maquina.contratoConfig?.dataFim || "")
                            }
                          >
                            <span className="text-xs flex-1">{maquina.prazoDados || maquina.contratoConfig?.dataFim || "-"}</span>
                            <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm py-3 px-4 align-middle">
                        {isEditing(maquina.id, "acaoResponsavel") ? (
                          <div className="flex gap-2 items-center">
                            <Input
                              value={editingState?.value || ""}
                              onChange={(e) =>
                                setEditingState((prev) =>
                                  prev ? { ...prev, value: e.target.value } : null
                                )
                              }
                              className="h-8 text-xs flex-1"
                              placeholder="Digite a ação"
                              disabled={isSaving}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditSave(maquina.id)}
                              className="h-8 w-8 p-0 flex-shrink-0"
                              disabled={isSaving}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleEditCancel}
                              className="h-8 w-8 p-0 flex-shrink-0"
                              disabled={isSaving}
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <div className="text-xs text-center">{maquina.acaoResponsavel || "-"}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm py-3 px-4 align-middle">
                        {isEditing(maquina.id, "responsavel") ? (
                          <div className="flex gap-2 items-center">
                            <Input
                              value={editingState?.value || ""}
                              onChange={(e) =>
                                setEditingState((prev) =>
                                  prev ? { ...prev, value: e.target.value } : null
                                )
                              }
                              className="h-8 text-xs flex-1"
                              placeholder="Digite o responsável"
                              disabled={isSaving}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditSave(maquina.id)}
                              className="h-8 w-8 p-0 flex-shrink-0"
                              disabled={isSaving}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleEditCancel}
                              className="h-8 w-8 p-0 flex-shrink-0"
                              disabled={isSaving}
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:bg-muted p-2 rounded transition-colors"
                            onClick={() =>
                              handleEditStart(
                                maquina.id,
                                "responsavel",
                                maquina.responsavel || ""
                              )
                            }
                          >
                            <span className="text-xs">{maquina.responsavel || "-"}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground py-3 px-4 align-middle">
                        {formatDate(maquina.updated_at || maquina.dataParada)}
                      </TableCell>
                      {visibleFields.contrato && (
                        <TableCell className="text-sm text-center py-3 px-4 align-middle">
                          {maquina.temContrato ? "Sim" : "Não"}
                        </TableCell>
                      )}
                      {visibleFields.dataParada && (
                        <TableCell className="text-sm py-3 px-4 align-middle">
                          {formatDate(maquina.dataParada)}
                        </TableCell>
                      )}
                      {visibleFields.tempoParada && (
                        <TableCell className="text-sm text-center font-medium py-3 px-4 align-middle">
                          {getDiasParadaNum(maquina.dataParada)} dias
                        </TableCell>
                      )}
                      <TableCell className="text-center py-3 px-4 align-middle">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-muted"
                          onClick={() => {
                            handleEditStart(maquina.id, "prazo", maquina.contratoConfig?.dataFim || "")
                          }}
                        >
                          <Edit2 className="h-4 w-4 text-blue-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={13 + (visibleFields.contrato ? 1 : 0) + (visibleFields.dataParada ? 1 : 0) + (visibleFields.tempoParada ? 1 : 0)} className="text-center py-8 text-muted-foreground">
                    Nenhuma máquina parada encontrada com os filtros aplicados
                  </TableCell>
                </TableRow>
              )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
