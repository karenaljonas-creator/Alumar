"use client"

import { useState, useMemo } from "react"
import type { Machine } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Search, AlertTriangle } from "lucide-react"

interface GestaoParadasProps {
  machines: Machine[]
}

export function GestaoParadas({ machines }: GestaoParadasProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [contratoFilter, setContratoFilter] = useState("todos")
  const [acaoFilter, setAcaoFilter] = useState("todos")
  const [localizacaoFilter, setLocalizacaoFilter] = useState("todas")

  const maquinasParadas = useMemo(() => {
    return machines.filter((m) => m.status === "parada" || m.status === "v0")
  }, [machines])

  const filteredMachines = useMemo(() => {
    return maquinasParadas.filter((m) => {
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
  }, [maquinasParadas, searchTerm, contratoFilter, acaoFilter, localizacaoFilter])

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
                  <TableHead>TAG</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Localizacao</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data de Parada</TableHead>
                  <TableHead className="text-center">Dias Parada</TableHead>
                  <TableHead>Acao</TableHead>
                  <TableHead className="text-center">Responsavel</TableHead>
                  <TableHead className="min-w-[300px]">Observacoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMachines.length > 0 ? (
                  filteredMachines.map((maquina) => (
                    <TableRow key={maquina.id}>
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
                      <TableCell className="text-sm">{maquina.acaoResponsavel || "-"}</TableCell>
                      <TableCell className="text-sm text-center">{maquina.responsavel || "-"}</TableCell>
                      <TableCell className="text-sm min-w-[300px] whitespace-normal">
                        {maquina.motivoParada || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
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
