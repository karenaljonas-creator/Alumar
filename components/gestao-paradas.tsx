"use client"

import { useState, useMemo, useCallback } from "react"
import type { Machine } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, AlertTriangle, ArrowUp, ArrowDown, ArrowUpDown, Edit2, Check, X, ChevronDown } from "lucide-react"

type SortKey = "nome" | "tipo" | "localizacao" | "contrato" | "tipoEquip" | "status" | "dataParada" | "diasParada" | "prazo" | "acao" | "responsavel" | "observacoes"
type SortDirection = "asc" | "desc"

interface GestaoParadasProps {
  machines: Machine[]
}

interface EditingState {
  machineId: string
  field: string
  value: string
}

export function GestaoParadas({ machines }: GestaoParadasProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [contratoFilter, setContratoFilter] = useState("todos")
  const [acaoFilter, setAcaoFilter] = useState("todos")
  const [localizacaoFilter, setLocalizacaoFilter] = useState("todas")
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [editingState, setEditingState] = useState<EditingState | null>(null)
  const [editedMachines, setEditedMachines] = useState<Record<string, Partial<Machine>>>({})
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [showHidden, setShowHidden] = useState(false)

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

  const calcularDiasParada = (dataParada?: string) => {
    if (!dataParada) return "-"
    try {
      const data = new Date(dataParada)
      const hoje = new Date()
      const diff = Math.floor((hoje.getTime() - data.getTime()) / (1000 * 60 * 60 * 24))
      return diff >= 0 ? diff : 0
    } catch {
      return "-"
    }
  }

  const handleEditStart = (machineId: string, field: string, value: string) => {
    setEditingState({ machineId, field, value })
  }

  const handleEditSave = (machineId: string) => {
    if (editingState && editingState.machineId === machineId) {
      setEditedMachines((prev) => ({
        ...prev,
        [machineId]: {
          ...(prev[machineId] || {}),
          [editingState.field]: editingState.value,
        },
      }))
      setEditingState(null)
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

  const toggleRowSelection = (machineId: string) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(machineId)) {
      newSelected.delete(machineId)
    } else {
      newSelected.add(machineId)
    }
    setSelectedRows(newSelected)
  }

  const visibleMachines = useMemo(() => {
    return filteredMachines.filter((m) => !selectedRows.has(m.id) || showHidden)
  }, [filteredMachines, selectedRows, showHidden])

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
        <CardContent className="space-y-4">
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
            {selectedRows.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHidden(!showHidden)}
                className="flex items-center gap-2"
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${showHidden ? "rotate-180" : ""}`} />
                {selectedRows.size} ocult{selectedRows.size === 1 ? "o" : "os"}
              </Button>
            )}
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

          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={visibleMachines.length > 0 && visibleMachines.every((m) => selectedRows.has(m.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const newSelected = new Set(selectedRows)
                          visibleMachines.forEach((m) => newSelected.add(m.id))
                          setSelectedRows(newSelected)
                        } else {
                          const newSelected = new Set(selectedRows)
                          visibleMachines.forEach((m) => newSelected.delete(m.id))
                          setSelectedRows(newSelected)
                        }
                      }}
                      className="cursor-pointer"
                    />
                  </TableHead>
                  <TableHead className="w-12">Editar</TableHead>
                  <TableHead>
                    <button onClick={() => handleSort("nome")} className="flex items-center font-medium hover:text-foreground transition-colors cursor-pointer">
                      TAG <SortIcon columnKey="nome" />
                    </button>
                  </TableHead>
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
                    <button onClick={() => handleSort("contrato")} className="flex items-center font-medium hover:text-foreground transition-colors cursor-pointer">
                      Contrato <SortIcon columnKey="contrato" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button onClick={() => handleSort("tipoEquip")} className="flex items-center font-medium hover:text-foreground transition-colors cursor-pointer">
                      Tipo <SortIcon columnKey="tipoEquip" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button onClick={() => handleSort("status")} className="flex items-center font-medium hover:text-foreground transition-colors cursor-pointer">
                      Status <SortIcon columnKey="status" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button onClick={() => handleSort("dataParada")} className="flex items-center font-medium hover:text-foreground transition-colors cursor-pointer">
                      Data de Parada <SortIcon columnKey="dataParada" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button onClick={() => handleSort("diasParada")} className="flex items-center font-medium hover:text-foreground transition-colors cursor-pointer">
                      Dias Parada <SortIcon columnKey="diasParada" />
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
                  <TableHead className="min-w-[300px]">
                    <button onClick={() => handleSort("observacoes")} className="flex items-center font-medium hover:text-foreground transition-colors cursor-pointer">
                      Observacoes <SortIcon columnKey="observacoes" />
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleMachines.length > 0 ? (
                  visibleMachines.map((maquina) => (
                    <TableRow key={maquina.id} className={selectedRows.has(maquina.id) && !showHidden ? "opacity-50" : ""}>
                      <TableCell className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(maquina.id)}
                          onChange={() => toggleRowSelection(maquina.id)}
                          className="cursor-pointer"
                        />
                      </TableCell>
                      <TableCell className="w-12">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => handleEditStart(maquina.id, "edit", maquina.id)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{maquina.nome}</TableCell>
                      <TableCell className="text-sm">{maquina.tipo}</TableCell>
                      <TableCell className="text-sm">{maquina.localizacao}</TableCell>
                      <TableCell className="text-sm">
                        <Badge
                          variant={maquina.temContrato ? "default" : "secondary"}
                          className={maquina.temContrato ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                        >
                          {maquina.temContrato ? "Sim" : "Nao"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {maquina.tipo.includes("Compressor")
                          ? "Compressor"
                          : maquina.tipo.includes("Secador")
                            ? "Secador"
                            : maquina.tipo.includes("Soprador")
                              ? "Soprador"
                              : "Filtro"}
                      </TableCell>
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
                      <TableCell className="text-sm font-medium">
                        {formatDate(maquina.dataParada)}
                      </TableCell>
                      <TableCell className="text-sm text-center font-semibold">
                        {calcularDiasParada(maquina.dataParada)}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {isEditing(maquina.id, "dataFim") ? (
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
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:bg-muted p-1 rounded"
                            onClick={() =>
                              handleEditStart(
                                maquina.id,
                                "dataFim",
                                maquina.contratoConfig?.dataFim || ""
                              )
                            }
                          >
                            <span>{formatDate(getDisplayValue(maquina.id, "dataFim", maquina.contratoConfig?.dataFim || "-"))}</span>
                            <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {isEditing(maquina.id, "acaoResponsavel") ? (
                          <div className="flex gap-2 items-center">
                            <Input
                              value={editingState?.value || ""}
                              onChange={(e) =>
                                setEditingState((prev) =>
                                  prev ? { ...prev, value: e.target.value } : null
                                )
                              }
                              className="h-8 text-xs"
                              placeholder="Digite a ação"
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
                                "acaoResponsavel",
                                maquina.acaoResponsavel || ""
                              )
                            }
                          >
                            <span>{getDisplayValue(maquina.id, "acaoResponsavel", maquina.acaoResponsavel || "-")}</span>
                            <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-center">
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
                            <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                          </div>
                        )}
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
                              className="h-8 text-xs flex-1"
                              placeholder="Digite a observação"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditSave(maquina.id)}
                              className="h-8 w-8 p-0 flex-shrink-0"
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleEditCancel}
                              className="h-8 w-8 p-0 flex-shrink-0"
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
                            <span>{getDisplayValue(maquina.id, "motivoParada", maquina.motivoParada || "-")}</span>
                            <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">
                      Nenhuma máquina parada encontrada
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
