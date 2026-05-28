"use client"

import { useState, useMemo, useCallback } from "react"
import type { Machine } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, AlertTriangle, ArrowUp, ArrowDown, ArrowUpDown, Check, X, Edit2 } from "lucide-react"
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
  const { toast } = useToast()

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else {
        setSortKey(null)
        setSortDirection("asc")
      }
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }, [sortKey, sortDirection])

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />
    if (sortDirection === "asc") return <ArrowUp className="h-3 w-3 ml-1" />
    return <ArrowDown className="h-3 w-3 ml-1" />
  }

  const maquinasParadas = useMemo(() => {
    return machines.filter((m) => m.status === "parada" || m.status === "v0")
  }, [machines])

  const getTipoEquip = (m: Machine) => {
    if (m.tipo.includes("Compressor")) return "Compressor"
    if (m.tipo.includes("Secador")) return "Secador"
    if (m.tipo.includes("Soprador")) return "Soprador"
    return "Filtro"
  }

  const getDiasParadaNum = (dataParada?: string) => {
    if (!dataParada) return -1
    try {
      const data = new Date(dataParada)
      const hoje = new Date()
      return Math.floor((hoje.getTime() - data.getTime()) / (1000 * 60 * 60 * 24))
    } catch {
      return -1
    }
  }

  const filteredMachines = useMemo(() => {
    const filtered = maquinasParadas.filter((m) => {
      const matchesSearch =
        m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.tipo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.responsavel || "").toLowerCase().includes(searchTerm.toLowerCase())
      const matchesContrato =
        contratoFilter === "todos" ||
        (contratoFilter === "sim" && m.temContrato) ||
        (contratoFilter === "nao" && !m.temContrato)
      const matchesAcao =
        acaoFilter === "todos" || (m.acaoResponsavel || "").toLowerCase() === acaoFilter.toLowerCase()
      const matchesLocalizacao =
        localizacaoFilter === "todas" || m.localizacao === localizacaoFilter
      return matchesSearch && matchesContrato && matchesAcao && matchesLocalizacao
    })

    if (!sortKey) return filtered

    return [...filtered].sort((a, b) => {
      let valA: string | number = ""
      let valB: string | number = ""

      switch (sortKey) {
        case "nome":
          valA = a.nome.toLowerCase(); valB = b.nome.toLowerCase(); break
        case "tipo":
          valA = a.tipo.toLowerCase(); valB = b.tipo.toLowerCase(); break
        case "localizacao":
          valA = a.localizacao.toLowerCase(); valB = b.localizacao.toLowerCase(); break
        case "contrato":
          valA = a.temContrato ? 1 : 0; valB = b.temContrato ? 1 : 0; break
        case "tipoEquip":
          valA = getTipoEquip(a).toLowerCase(); valB = getTipoEquip(b).toLowerCase(); break
        case "status":
          valA = a.status; valB = b.status; break
        case "dataParada":
          valA = a.dataParada || ""; valB = b.dataParada || ""; break
        case "diasParada":
          valA = getDiasParadaNum(a.dataParada); valB = getDiasParadaNum(b.dataParada); break
        case "prazo":
          valA = a.contratoConfig?.dataFim || ""; valB = b.contratoConfig?.dataFim || ""; break
        case "dataAtualizacao":
          valA = a.updated_at || a.dataParada || ""; valB = b.updated_at || b.dataParada || ""; break
        case "acao":
          valA = (a.acaoResponsavel || "").toLowerCase(); valB = (b.acaoResponsavel || "").toLowerCase(); break
        case "responsavel":
          valA = (a.responsavel || "").toLowerCase(); valB = (b.responsavel || "").toLowerCase(); break
        case "observacoes":
          valA = (a.motivoParada || "").toLowerCase(); valB = (b.motivoParada || "").toLowerCase(); break
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1
      if (valA > valB) return sortDirection === "asc" ? 1 : -1
      return 0
    })
  }, [maquinasParadas, searchTerm, contratoFilter, acaoFilter, localizacaoFilter, sortKey, sortDirection])

  const localizacoes = useMemo(() => {
    return Array.from(new Set(maquinasParadas.map((m) => m.localizacao))).sort()
  }, [maquinasParadas])

  const acoes = useMemo(() => {
    return Array.from(new Set(maquinasParadas.map((m) => m.acaoResponsavel).filter(Boolean))).sort()
  }, [maquinasParadas])

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-"
    try {
      return new Date(dateStr).toLocaleDateString("pt-BR")
    } catch {
      return dateStr
    }
  }

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
            // Salvar a data exatamente como foi escolhida (sem conversão de timezone)
            if (updated.contratoConfig) {
              updated.contratoConfig.dataFim = editingState.value
            }
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

  const getDisplayValue = (machineId: string, field: string, defaultValue: string) => {
    if (editedMachines[machineId] && editedMachines[machineId][field as keyof Machine]) {
      return String(editedMachines[machineId][field as keyof Machine])
    }
    return defaultValue
  }

  const isEditing = (machineId: string, field: string) => {
    return editingState?.machineId === machineId && editingState?.field === field
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
              {maquinasParadas.length} parada{maquinasParadas.length !== 1 ? "s" : ""}
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
            <Table className="w-full">
                <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead>
                    <button onClick={() => handleSort("tipo")} className="flex items-center font-medium hover:text-foreground transition-colors cursor-pointer">
                      Modelo <SortIcon columnKey="tipo" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button onClick={() => handleSort("localizacao")} className="flex items-center font-medium hover:text-foreground transition-colors cursor-pointer">
                      Localizacao <SortIcon columnKey="localizacao" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button onClick={() => handleSort("status")} className="flex items-center font-medium hover:text-foreground transition-colors cursor-pointer">
                      Status <SortIcon columnKey="status" />
                    </button>
                  </TableHead>
                  <TableHead className="min-w-[300px]">
                    <button onClick={() => handleSort("observacoes")} className="flex items-center font-medium hover:text-foreground transition-colors cursor-pointer">
                      Observacoes <SortIcon columnKey="observacoes" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button onClick={() => handleSort("prazo")} className="flex items-center font-medium hover:text-foreground transition-colors cursor-pointer">
                      Prazo <SortIcon columnKey="prazo" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button onClick={() => handleSort("acao")} className="flex items-center font-medium hover:text-foreground transition-colors cursor-pointer">
                      Acao <SortIcon columnKey="acao" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button onClick={() => handleSort("responsavel")} className="flex items-center font-medium hover:text-foreground transition-colors cursor-pointer">
                      Responsavel <SortIcon columnKey="responsavel" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button onClick={() => handleSort("dataAtualizacao")} className="flex items-center font-medium hover:text-foreground transition-colors cursor-pointer">
                      Atualizado em <SortIcon columnKey="dataAtualizacao" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[80px] text-center">
                    <span className="font-medium">Editar</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMachines.length > 0 ? (
                  filteredMachines.map((maquina) => (
                    <TableRow key={maquina.id}>
                      <TableCell className="text-sm">{maquina.tipo}</TableCell>
                      <TableCell className="text-sm">{maquina.localizacao}</TableCell>
                      <TableCell>
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
                      <TableCell className="text-sm min-w-[300px] whitespace-normal">
                        {isEditing(maquina.id, "motivoParada") ? (
                          <div className="flex gap-2 items-start">
                            <Input
                              value={editingState?.value || ""}
                              onChange={(e) =>
                                setEditingState((prev) =>
                                  prev ? { ...prev, value: e.target.value } : null
                                )
                              }
                              className="h-8 text-xs"
                              placeholder="Digite a observação"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditSave(maquina.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleEditCancel}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:bg-muted p-1 rounded"
                            onClick={() =>
                              handleEditStart(
                                maquina.id,
                                "motivoParada",
                                maquina.motivoParada || ""
                              )
                            }
                          >
                            <span className="text-xs">{getDisplayValue(maquina.id, "motivoParada", maquina.motivoParada || "-")}</span>
                            <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {isEditing(maquina.id, "prazo") ? (
                          <div className="flex gap-2 items-center">
                            <Input
                              type="date"
                              value={editingState?.value || ""}
                              onChange={(e) =>
                                setEditingState((prev) =>
                                  prev ? { ...prev, value: e.target.value } : null
                                )
                              }
                              className="h-8 text-xs"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditSave(maquina.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleEditCancel}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2 items-center">
                            <span>
                              {formatDate(getDisplayValue(maquina.id, "prazo", maquina.contratoConfig?.dataFim || "-"))}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditStart(maquina.id, "prazo", maquina.contratoConfig?.dataFim || "")}
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={maquina.acaoResponsavel === "Manutenção" ? "bg-blue-100 text-blue-800" : ""}
                        >
                          {maquina.acaoResponsavel || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {isEditing(maquina.id, "responsavel") ? (
                          <div className="flex gap-2 items-center">
                            <Input
                              value={editingState?.value || ""}
                              onChange={(e) =>
                                setEditingState((prev) =>
                                  prev ? { ...prev, value: e.target.value } : null
                                )
                              }
                              className="h-8 text-xs"
                              placeholder="Digite o responsável"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditSave(maquina.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleEditCancel}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:bg-muted p-1 rounded"
                            onClick={() =>
                              handleEditStart(
                                maquina.id,
                                "responsavel",
                                maquina.responsavel || ""
                              )
                            }
                          >
                            <span>{getDisplayValue(maquina.id, "responsavel", maquina.responsavel || "-")}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(maquina.updated_at || maquina.dataParada)}
                      </TableCell>
                      <TableCell className="text-center">
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
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
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
