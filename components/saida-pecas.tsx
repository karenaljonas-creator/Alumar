"use client"

import { useState, useEffect, useCallback } from "react"
import type { Machine } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Edit, Trash2, PackageMinus, ArrowUp, ArrowDown, ArrowUpDown, Check, AlertCircle, FileSearch } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface SaidaPeca {
  id: string
  codigo: string
  descricao: string
  quantidade: number
  data_saida: string
  ordem_servico: string
  nota_fiscal: string
  area: string
  compressor: string
  utilizacao: string
  observacao: string
  created_at: string
}

interface EstoquePeca {
  codigo: string
  descricao: string
}

type SortKey = "codigo" | "descricao" | "quantidade" | "data_saida" | "ordem_servico" | "area" | "compressor" | "utilizacao" | "data_atualizacao"
type SortDirection = "asc" | "desc"

const UTILIZACOES = ["Corretiva", "Preventiva"]

interface SaidaPecasProps {
  machines: Machine[]
}

export function SaidaPecas({ machines }: SaidaPecasProps) {
  const [saidas, setSaidas] = useState<SaidaPeca[]>([])
  const [estoquePecas, setEstoquePecas] = useState<EstoquePeca[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSaida, setEditingSaida] = useState<SaidaPeca | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [codigoEncontrado, setCodigoEncontrado] = useState<boolean | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    codigo: "",
    descricao: "",
    quantidade: 1,
    data_saida: new Date().toISOString().split("T")[0],
    ordem_servico: "",
    nota_fiscal: "",
    area: "",
    compressor: "",
    utilizacao: "",
    observacao: "",
  })

  const [buscaNF, setBuscaNF] = useState("")
  const [buscandoNF, setBuscandoNF] = useState(false)

  // Get unique areas from machines
  const areas = [...new Set(machines.map((m) => m.localizacao))].filter(Boolean).sort()

  const loadSaidas = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("saida_pecas")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      toast({ title: "Erro ao carregar saídas", description: error.message, variant: "destructive" })
    } else {
      setSaidas(data || [])
    }
    setLoading(false)
  }, [supabase, toast])

  const loadEstoquePecas = useCallback(async () => {
    const { data, error } = await supabase
      .from("estoque_pecas")
      .select("codigo, descricao")
      .order("codigo")

    if (error) {
      console.error("Erro ao carregar estoque:", error)
    } else {
      // Get unique codes with their descriptions
      const uniquePecas = data?.reduce((acc: EstoquePeca[], curr) => {
        if (!acc.find((p) => p.codigo === curr.codigo)) {
          acc.push({ codigo: curr.codigo, descricao: curr.descricao })
        }
        return acc
      }, []) || []
      setEstoquePecas(uniquePecas)
    }
  }, [supabase])

  useEffect(() => {
    loadSaidas()
    loadEstoquePecas()
  }, [loadSaidas, loadEstoquePecas])

  // Buscar itens por Nota Fiscal da entrada
  const handleBuscarNF = async () => {
    if (!buscaNF.trim()) {
      toast({ title: "Digite o número da Nota Fiscal", variant: "destructive" })
      return
    }

    setBuscandoNF(true)
    console.log("[v0] Buscando NF:", buscaNF.trim())
    
    const { data, error } = await supabase
      .from("estoque_pecas")
      .select("codigo, descricao, nota_fiscal")
      .ilike("nota_fiscal", `%${buscaNF.trim()}%`)
      .limit(1)

    console.log("[v0] Resultado da busca:", { data, error })

    if (error) {
      toast({ title: "Erro ao buscar NF", description: error.message, variant: "destructive" })
    } else if (data && data.length > 0) {
      const peca = data[0]
      setFormData((prev) => ({
        ...prev,
        codigo: peca.codigo,
        descricao: peca.descricao,
        nota_fiscal: peca.nota_fiscal,
      }))
      setCodigoEncontrado(true)
      toast({ title: "Item encontrado!", description: `${peca.codigo} - ${peca.descricao}` })
    } else {
      toast({ title: "Nota Fiscal não encontrada", description: "Nenhum item de entrada com essa NF foi encontrado.", variant: "destructive" })
    }
    setBuscandoNF(false)
  }

  // Auto-fill description when code changes
  const handleCodigoChange = (codigo: string) => {
    setFormData((prev) => ({ ...prev, codigo }))
    
    if (codigo.length >= 3) {
      const peca = estoquePecas.find((p) => p.codigo.toLowerCase() === codigo.toLowerCase())
      if (peca) {
        setFormData((prev) => ({ ...prev, codigo: peca.codigo, descricao: peca.descricao }))
        setCodigoEncontrado(true)
      } else {
        setCodigoEncontrado(false)
      }
    } else {
      setCodigoEncontrado(null)
    }
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

  const filteredSaidas = saidas
    .filter((s) =>
      s.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.ordem_servico.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.compressor.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (!sortKey) return 0
      let valA: string | number = ""
      let valB: string | number = ""

      switch (sortKey) {
        case "codigo": valA = a.codigo.toLowerCase(); valB = b.codigo.toLowerCase(); break
        case "descricao": valA = a.descricao.toLowerCase(); valB = b.descricao.toLowerCase(); break
        case "quantidade": valA = a.quantidade; valB = b.quantidade; break
        case "data_saida": valA = a.data_saida; valB = b.data_saida; break
        case "ordem_servico": valA = a.ordem_servico.toLowerCase(); valB = b.ordem_servico.toLowerCase(); break
        case "area": valA = a.area.toLowerCase(); valB = b.area.toLowerCase(); break
        case "compressor": valA = a.compressor.toLowerCase(); valB = b.compressor.toLowerCase(); break
        case "utilizacao": valA = a.utilizacao.toLowerCase(); valB = b.utilizacao.toLowerCase(); break
        case "data_atualizacao": valA = a.updated_at || a.created_at; valB = b.updated_at || b.created_at; break
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1
      if (valA > valB) return sortDirection === "asc" ? 1 : -1
      return 0
    })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (editingSaida) {
      const { error } = await supabase
        .from("saida_pecas")
        .update(formData)
        .eq("id", editingSaida.id)

      if (error) {
        toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" })
      } else {
        toast({ title: "Saída atualizada com sucesso!" })
        loadSaidas()
        resetForm()
      }
    } else {
      const { error } = await supabase
        .from("saida_pecas")
        .insert(formData)

      if (error) {
        toast({ title: "Erro ao cadastrar", description: error.message, variant: "destructive" })
      } else {
        toast({ title: "Saída registrada com sucesso!" })
        loadSaidas()
        resetForm()
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta saída?")) return

    const { error } = await supabase.from("saida_pecas").delete().eq("id", id)
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "Saída excluída com sucesso!" })
      loadSaidas()
    }
  }

  const handleEdit = (saida: SaidaPeca) => {
    setEditingSaida(saida)
    setFormData({
      codigo: saida.codigo,
      descricao: saida.descricao,
      quantidade: saida.quantidade,
      data_saida: saida.data_saida,
      ordem_servico: saida.ordem_servico,
      nota_fiscal: saida.nota_fiscal || "",
      area: saida.area,
      compressor: saida.compressor,
      utilizacao: saida.utilizacao,
      observacao: saida.observacao || "",
    })
    setCodigoEncontrado(true)
    setBuscaNF(saida.nota_fiscal || "")
    setDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      codigo: "",
      descricao: "",
      quantidade: 1,
      data_saida: new Date().toISOString().split("T")[0],
      ordem_servico: "",
      nota_fiscal: "",
      area: "",
      compressor: "",
      utilizacao: "",
      observacao: "",
    })
    setEditingSaida(null)
    setCodigoEncontrado(null)
    setBuscaNF("")
    setDialogOpen(false)
  }

  // Filter machines by selected area
  const machinesInArea = formData.area
    ? machines.filter((m) => m.localizacao === formData.area)
    : machines

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Saída de Peças</h2>
          <p className="text-sm text-muted-foreground">Registro de saída de peças do estoque</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setDialogOpen(true) }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Saída
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingSaida ? "Editar Saída de Peça" : "Registrar Saída de Peça"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Buscar itens por Nota Fiscal */}
              <div className="space-y-2 p-3 bg-muted/50 rounded-lg border">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <FileSearch className="h-4 w-4" />
                  Buscar itens por Nota Fiscal
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={buscaNF}
                    onChange={(e) => setBuscaNF(e.target.value)}
                    placeholder="Digite o número da NF da Entrada"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleBuscarNF()
                      }
                    }}
                  />
                  <Button type="button" variant="secondary" onClick={handleBuscarNF} disabled={buscandoNF}>
                    {buscandoNF ? "Buscando..." : "Buscar"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Busque pela NF da Entrada para carregar os itens automaticamente</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código (PN)</Label>
                  <div className="relative">
                    <Input
                      id="codigo"
                      value={formData.codigo}
                      onChange={(e) => handleCodigoChange(e.target.value)}
                      placeholder="Digite o código da peça"
                      required
                      list="codigos-list"
                      className={codigoEncontrado === true ? "border-green-500 pr-10" : codigoEncontrado === false ? "border-amber-500 pr-10" : ""}
                    />
                    {codigoEncontrado === true && (
                      <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
                    )}
                    {codigoEncontrado === false && (
                      <AlertCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-500" />
                    )}
                  </div>
                  <datalist id="codigos-list">
                    {estoquePecas.map((p) => (
                      <option key={p.codigo} value={p.codigo}>{p.descricao}</option>
                    ))}
                  </datalist>
                  {codigoEncontrado === true && (
                    <p className="text-xs text-green-600">Código encontrado no estoque!</p>
                  )}
                  {codigoEncontrado === false && (
                    <p className="text-xs text-amber-600">Código não encontrado no estoque. Você pode preencher a descrição manualmente.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Input
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Preenchido automaticamente"
                    required
                    readOnly={codigoEncontrado === true}
                    className={codigoEncontrado === true ? "bg-muted" : ""}
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantidade">Quantidade</Label>
                  <Input
                    id="quantidade"
                    type="number"
                    min="1"
                    value={formData.quantidade}
                    onChange={(e) => setFormData({ ...formData, quantidade: parseInt(e.target.value) || 1 })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_saida">Data</Label>
                  <Input
                    id="data_saida"
                    type="date"
                    value={formData.data_saida}
                    onChange={(e) => setFormData({ ...formData, data_saida: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ordem_servico">Ordem de Serviço</Label>
                  <Input
                    id="ordem_servico"
                    value={formData.ordem_servico}
                    onChange={(e) => setFormData({ ...formData, ordem_servico: e.target.value })}
                    placeholder="Ex: 408103074"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nota_fiscal">Nota Fiscal</Label>
                  <Input
                    id="nota_fiscal"
                    value={formData.nota_fiscal}
                    onChange={(e) => setFormData({ ...formData, nota_fiscal: e.target.value })}
                    placeholder="Ex: 276521-15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="area">Área</Label>
                  <Select value={formData.area} onValueChange={(v) => setFormData({ ...formData, area: v, compressor: "" })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a área" />
                    </SelectTrigger>
                    <SelectContent>
                      {areas.map((a) => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="compressor">Equipamento (TAG)</Label>
                  <Select value={formData.compressor} onValueChange={(v) => setFormData({ ...formData, compressor: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o equipamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {machinesInArea.map((m) => (
                        <SelectItem key={m.id} value={m.nome}>{m.nome} - {m.tipo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="utilizacao">Utilização</Label>
                  <Select value={formData.utilizacao} onValueChange={(v) => setFormData({ ...formData, utilizacao: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {UTILIZACOES.map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacao">Observação</Label>
                <Input
                  id="observacao"
                  value={formData.observacao}
                  onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                  placeholder="Observações adicionais sobre a saída..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button type="submit">{editingSaida ? "Salvar Alterações" : "Registrar Saída"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Saídas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredSaidas.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Itens Utilizados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredSaidas.reduce((acc, s) => acc + s.quantidade, 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Corretiva / Preventiva</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span className="text-amber-600">{filteredSaidas.filter((s) => s.utilizacao === "Corretiva").length}</span>
              {" / "}
              <span className="text-blue-600">{filteredSaidas.filter((s) => s.utilizacao === "Preventiva").length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <PackageMinus className="h-5 w-5" />
              Registro de Saídas
            </CardTitle>
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, descrição, OS ou TAG..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Carregando...</div>
          ) : filteredSaidas.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Nenhuma saída registrada. Clique em &quot;Nova Saída&quot; para adicionar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead>
                      <button onClick={() => handleSort("codigo")} className="flex items-center font-medium hover:text-foreground cursor-pointer">
                        Código <SortIcon columnKey="codigo" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => handleSort("descricao")} className="flex items-center font-medium hover:text-foreground cursor-pointer">
                        Descrição <SortIcon columnKey="descricao" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => handleSort("quantidade")} className="flex items-center font-medium hover:text-foreground cursor-pointer">
                        Qtd <SortIcon columnKey="quantidade" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => handleSort("data_saida")} className="flex items-center font-medium hover:text-foreground cursor-pointer">
                        Data <SortIcon columnKey="data_saida" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => handleSort("ordem_servico")} className="flex items-center font-medium hover:text-foreground cursor-pointer">
                        Ordem Serviço <SortIcon columnKey="ordem_servico" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => handleSort("area")} className="flex items-center font-medium hover:text-foreground cursor-pointer">
                        Área <SortIcon columnKey="area" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => handleSort("compressor")} className="flex items-center font-medium hover:text-foreground cursor-pointer">
                        Equipamento <SortIcon columnKey="compressor" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => handleSort("utilizacao")} className="flex items-center font-medium hover:text-foreground cursor-pointer">
                        Utilização <SortIcon columnKey="utilizacao" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => handleSort("data_atualizacao")} className="flex items-center font-medium hover:text-foreground cursor-pointer">
                        Atualizado em <SortIcon columnKey="data_atualizacao" />
                      </button>
                    </TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSaidas.map((saida) => (
                    <TableRow key={saida.id}>
                      <TableCell className="font-mono font-medium">{saida.codigo}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{saida.descricao}</TableCell>
                      <TableCell className="text-center">{saida.quantidade}</TableCell>
                      <TableCell>
                        {saida.data_saida ? new Date(saida.data_saida).toLocaleDateString("pt-BR") : "-"}
                      </TableCell>
                      <TableCell>{saida.ordem_servico || "-"}</TableCell>
                      <TableCell>{saida.area}</TableCell>
                      <TableCell className="font-medium">{saida.compressor}</TableCell>
                      <TableCell>
                        <Badge
                          variant={saida.utilizacao === "Corretiva" ? "destructive" : "default"}
                          className={saida.utilizacao === "Preventiva" ? "bg-blue-500 hover:bg-blue-600" : ""}
                        >
                          {saida.utilizacao}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {saida.updated_at ? new Date(saida.updated_at).toLocaleDateString("pt-BR", {day: "2-digit", month: "2-digit", year: "numeric"}) : new Date(saida.created_at).toLocaleDateString("pt-BR", {day: "2-digit", month: "2-digit", year: "numeric"})}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(saida)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(saida.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
