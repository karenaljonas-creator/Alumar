"use client"

import { useState, useMemo, useCallback } from "react"
import type { Machine } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Input } from "@/components/ui/input"
import { Search, AlertTriangle, ArrowUp, ArrowDown, ArrowUpDown, ChevronRight, ChevronDown } from "lucide-react"

type SortKey = "nome" | "tipo" | "localizacao" | "contrato" | "tipoEquip" | "status" | "dataParada" | "diasParada" | "acao" | "responsavel" | "observacoes"
type SortDirection = "asc" | "desc"

interface GestaoParadasProps {
  machines: Machine[]
  onUpdateMachine?: (machine: Machine) => Promise<void>
}

export function GestaoParadas({ machines, onUpdateMachine }: GestaoParadasProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [contratoFilter, setContratoFilter] = useState("todos")
  const [acaoFilter, setAcaoFilter] = useState("todos")
  const [localizacaoFilter, setLocalizacaoFilter] = useState("todas")
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [showDiasParada, setShowDiasParada] = useState(false)
  const [showContrato, setShowContrato] = useState(false)
  const [showTipo, setShowTipo] = useState(false)
  const [showDataParada, setShowDataParada] = useState(false)
  const [editingPrazo, setEditingPrazo] = useState<string | null>(null)
  const [prazoValue, setPrazoValue] = useState("")

  const handleSavePrazo = async (maquina: Machine) => {
    if (onUpdateMachine && prazoValue.trim() !== "") {
      await onUpdateMachine({ ...maquina, prazo: prazoValue.trim() })
    }
    setEditingPrazo(null)
    setPrazoValue("")
  }

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
              <SearchableSelect
                options={[{ value: "todas", label: "Todas" }, ...localizacoes.map((loc) => ({ value: loc, label: loc }))]}
                value={localizacaoFilter}
                onValueChange={setLocalizacaoFilter}
                placeholder="Todas"
                searchPlaceholder="Pesquisar localização..."
                className="w-[180px]"
              />
            </div>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
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
                  <TableHead className="w-[40px]">
                    <button
                      onClick={() => setShowContrato(!showContrato)}
                      className="p-1 hover:bg-muted rounded"
                      title={showContrato ? "Ocultar Contrato" : "Mostrar Contrato"}
                    >
                      {showContrato ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  </TableHead>
                  {showContrato && (
                    <TableHead>
                      <button onClick={() => handleSort("contrato")} className="flex items-center font-medium hover:text-foreground transition-colors cursor-pointer">
                        Contrato <SortIcon columnKey="contrato" />
                      </button>
                    </TableHead>
                  )}
                  <TableHead className="w-[40px]">
                    <button
                      onClick={() => setShowTipo(!showTipo)}
                      className="p-1 hover:bg-muted rounded"
                      title={showTipo ? "Ocultar Tipo" : "Mostrar Tipo"}
                    >
                      {showTipo ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  </TableHead>
                  {showTipo && (
                    <TableHead>
                      <button onClick={() => handleSort("tipoEquip")} className="flex items-center font-medium hover:text-foreground transition-colors cursor-pointer">
                        Tipo <SortIcon columnKey="tipoEquip" />
                      </button>
                    </TableHead>
                  )}
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
                  <TableHead className="min-w-[120px]">
                    <span className="font-medium">Prazo</span>
                  </TableHead>
                  <TableHead className="w-[40px]">
                    <button
                      onClick={() => setShowDataParada(!showDataParada)}
                      className="p-1 hover:bg-muted rounded"
                      title={showDataParada ? "Ocultar Data de Parada" : "Mostrar Data de Parada"}
                    >
                      {showDataParada ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  </TableHead>
                  {showDataParada && (
                    <TableHead>
                      <button onClick={() => handleSort("dataParada")} className="flex items-center font-medium hover:text-foreground transition-colors cursor-pointer">
                        Data de Parada <SortIcon columnKey="dataParada" />
                      </button>
                    </TableHead>
                  )}
                  <TableHead className="w-[40px]">
                    <button
                      onClick={() => setShowDiasParada(!showDiasParada)}
                      className="p-1 hover:bg-muted rounded"
                      title={showDiasParada ? "Ocultar Dias Parada" : "Mostrar Dias Parada"}
                    >
                      {showDiasParada ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  </TableHead>
                  {showDiasParada && (
                    <TableHead>
                      <button onClick={() => handleSort("diasParada")} className="flex items-center font-medium hover:text-foreground transition-colors cursor-pointer">
                        Dias Parada <SortIcon columnKey="diasParada" />
                      </button>
                    </TableHead>
                  )}
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
                    <span className="font-medium">Última Atualização</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMachines.length > 0 ? (
                  filteredMachines.map((maquina) => (
                    <TableRow key={maquina.id}>
                      <TableCell className="font-medium">{maquina.nome}</TableCell>
                      <TableCell className="text-sm">{maquina.tipo}</TableCell>
                      <TableCell className="text-sm max-w-[120px]">
                        <span className="block leading-tight">{maquina.localizacao}</span>
                      </TableCell>
                      <TableCell></TableCell>
                      {showContrato && (
                        <TableCell className="text-sm">
                          <Badge
                            variant={maquina.temContrato ? "default" : "secondary"}
                            className={maquina.temContrato ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                          >
                            {maquina.temContrato ? "Sim" : "Nao"}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell></TableCell>
                      {showTipo && (
                        <TableCell className="text-sm">
                          {maquina.tipo.includes("Compressor")
                            ? "Compressor"
                            : maquina.tipo.includes("Secador")
                              ? "Secador"
                              : maquina.tipo.includes("Soprador")
                                ? "Soprador"
                                : "Filtro"}
                        </TableCell>
                      )}
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
                        {maquina.motivoParada || "-"}
                      </TableCell>
                      <TableCell className="text-sm min-w-[120px]">
                        {editingPrazo === maquina.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={prazoValue}
                              onChange={(e) => setPrazoValue(e.target.value)}
                              className="h-7 text-sm"
                              placeholder="Ex: 15/06/2026"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault()
                                  handleSavePrazo(maquina)
                                }
                                if (e.key === "Escape") {
                                  setEditingPrazo(null)
                                  setPrazoValue("")
                                }
                              }}
                              onBlur={() => {
                                if (prazoValue.trim() !== "") {
                                  handleSavePrazo(maquina)
                                } else {
                                  setEditingPrazo(null)
                                }
                              }}
                              autoFocus
                            />
                          </div>
                        ) : (
                          <span
                            className="cursor-pointer hover:bg-muted px-2 py-1 rounded block"
                            onClick={() => {
                              setEditingPrazo(maquina.id)
                              setPrazoValue(maquina.prazo || "")
                            }}
                            title="Clique para editar"
                          >
                            {maquina.prazo || "-"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell></TableCell>
                      {showDataParada && (
                        <TableCell className="text-sm font-medium">
                          {formatDate(maquina.dataParada)}
                        </TableCell>
                      )}
                      <TableCell></TableCell>
                      {showDiasParada && (
                        <TableCell className="text-sm text-center font-semibold">
                          {calcularDiasParada(maquina.dataParada)}
                        </TableCell>
                      )}
                      <TableCell className="text-sm">{maquina.acaoResponsavel || "-"}</TableCell>
                      <TableCell className="text-sm text-center">{maquina.responsavel || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {maquina.updatedAt ? new Date(maquina.updatedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={13 + (showContrato ? 1 : 0) + (showTipo ? 1 : 0) + (showDataParada ? 1 : 0) + (showDiasParada ? 1 : 0)} className="text-center text-muted-foreground py-8">
                      Nenhuma maquina parada encontrada com os filtros aplicados
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
