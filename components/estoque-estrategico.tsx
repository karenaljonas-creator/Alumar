"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Search, AlertTriangle, CheckCircle, Package, Plus, Edit, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

interface EstoqueEstrategicoItem {
  id: number
  codigo: string
  equipamento: string
  descricao: string
  quantidade_minima: number
}

interface EntradaPeca {
  codigo: string
  quantidade: number
}

interface SaidaPeca {
  codigo: string
  quantidade: number
}

export function EstoqueEstrategico() {
  const [itensEstrategicos, setItensEstrategicos] = useState<EstoqueEstrategicoItem[]>([])
  const [entradas, setEntradas] = useState<EntradaPeca[]>([])
  const [saidas, setSaidas] = useState<SaidaPeca[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [equipamentoFilter, setEquipamentoFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<EstoqueEstrategicoItem | null>(null)
  const [formData, setFormData] = useState({
    codigo: "",
    equipamento: "",
    descricao: "",
    quantidade_minima: 1,
  })
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    setLoading(true)
    try {
      const [estrategicoRes, entradasRes, saidasRes] = await Promise.all([
        supabase.from("estoque_estrategico").select("*").order("equipamento").order("descricao"),
        supabase.from("estoque_pecas").select("codigo, quantidade"),
        supabase.from("saida_pecas").select("codigo, quantidade"),
      ])

      if (estrategicoRes.data) setItensEstrategicos(estrategicoRes.data)
      if (entradasRes.data) setEntradas(entradasRes.data)
      if (saidasRes.data) setSaidas(saidasRes.data)
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
    }
    setLoading(false)
  }

  // Calcular saldo atual por código
  const saldoPorCodigo = useMemo(() => {
    const saldos: Record<string, number> = {}

    entradas.forEach((entrada) => {
      const codigo = entrada.codigo
      if (!saldos[codigo]) saldos[codigo] = 0
      saldos[codigo] += entrada.quantidade || 0
    })

    saidas.forEach((saida) => {
      const codigo = saida.codigo
      if (!saldos[codigo]) saldos[codigo] = 0
      saldos[codigo] -= saida.quantidade || 0
    })

    return saldos
  }, [entradas, saidas])

  // Combinar itens estratégicos com saldo atual
  const itensComSaldo = useMemo(() => {
    return itensEstrategicos.map((item) => {
      const saldoAtual = saldoPorCodigo[item.codigo] || 0
      const diferenca = saldoAtual - item.quantidade_minima
      const status = diferenca >= 0 ? "ok" : "abaixo"
      return {
        ...item,
        saldoAtual,
        diferenca,
        status,
      }
    })
  }, [itensEstrategicos, saldoPorCodigo])

  // Obter lista de equipamentos únicos
  const equipamentos = useMemo(() => {
    const unique = [...new Set(itensEstrategicos.map((item) => item.equipamento))]
    return unique.sort()
  }, [itensEstrategicos])

  // Filtrar itens
  const filteredItens = useMemo(() => {
    return itensComSaldo.filter((item) => {
      const term = searchTerm.toLowerCase()
      const matchesSearch =
        item.codigo.toLowerCase().includes(term) ||
        item.descricao.toLowerCase().includes(term) ||
        item.equipamento.toLowerCase().includes(term)

      const matchesEquipamento = equipamentoFilter === "all" || item.equipamento === equipamentoFilter

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "ok" && item.status === "ok") ||
        (statusFilter === "abaixo" && item.status === "abaixo")

      return matchesSearch && matchesEquipamento && matchesStatus
    })
  }, [itensComSaldo, searchTerm, equipamentoFilter, statusFilter])

  // Estatísticas
  const totalItens = itensComSaldo.length
  const itensOk = itensComSaldo.filter((item) => item.status === "ok").length
  const itensAbaixo = itensComSaldo.filter((item) => item.status === "abaixo").length
  const percentualOk = totalItens > 0 ? Math.round((itensOk / totalItens) * 100) : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (editingItem) {
      const { error } = await supabase
        .from("estoque_estrategico")
        .update(formData)
        .eq("id", editingItem.id)
      
      if (error) {
        toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" })
      } else {
        toast({ title: "Item atualizado com sucesso!" })
        loadAllData()
        resetForm()
      }
    } else {
      const { error } = await supabase
        .from("estoque_estrategico")
        .insert([formData])
      
      if (error) {
        toast({ title: "Erro ao cadastrar", description: error.message, variant: "destructive" })
      } else {
        toast({ title: "Item cadastrado com sucesso!" })
        loadAllData()
        resetForm()
      }
    }
  }

  const handleEdit = (item: EstoqueEstrategicoItem) => {
    setEditingItem(item)
    setFormData({
      codigo: item.codigo,
      equipamento: item.equipamento,
      descricao: item.descricao,
      quantidade_minima: item.quantidade_minima,
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este item?")) return
    
    const { error } = await supabase
      .from("estoque_estrategico")
      .delete()
      .eq("id", id)
    
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "Item excluído com sucesso!" })
      loadAllData()
    }
  }

  const resetForm = () => {
    setFormData({
      codigo: "",
      equipamento: "",
      descricao: "",
      quantidade_minima: 1,
    })
    setEditingItem(null)
    setDialogOpen(false)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Itens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItens}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Itens OK</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold text-green-600">{itensOk}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Itens Abaixo do Mínimo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-2xl font-bold text-red-600">{itensAbaixo}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cobertura do Estoque</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{percentualOk}%</div>
            <div className="mt-1 h-2 w-full rounded-full bg-gray-200">
              <div
                className={`h-2 rounded-full ${percentualOk >= 80 ? "bg-green-600" : percentualOk >= 50 ? "bg-amber-500" : "bg-red-600"}`}
                style={{ width: `${percentualOk}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <CardTitle>Controle de Estoque Mínimo</CardTitle>
          </div>
          <div className="flex items-center gap-4">
            <SearchableSelect
              options={[{ value: "all", label: "Todos Equipamentos" }, ...equipamentos.map((equip) => ({ value: equip, label: equip }))]}
              value={equipamentoFilter}
              onValueChange={setEquipamentoFilter}
              placeholder="Equipamento"
              searchPlaceholder="Pesquisar equipamento..."
              className="w-[180px]"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="ok">OK</SelectItem>
                <SelectItem value="abaixo">Abaixo do Mínimo</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, descrição ou equipamento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-[300px] pl-10"
              />
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setDialogOpen(true) }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingItem ? "Editar Item Estratégico" : "Novo Item Estratégico"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="codigo">Código (PN)</Label>
                      <Input
                        id="codigo"
                        value={formData.codigo}
                        onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                        placeholder="Ex: 1613610590"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="equipamento">Equipamento</Label>
                      <Input
                        id="equipamento"
                        value={formData.equipamento}
                        onChange={(e) => setFormData({ ...formData, equipamento: e.target.value })}
                        placeholder="Ex: GA90"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descricao">Descrição</Label>
                    <Input
                      id="descricao"
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      placeholder="Ex: KIT DE MANUTENCAO - 1 ANO"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantidade_minima">Quantidade Mínima</Label>
                    <Input
                      id="quantidade_minima"
                      type="number"
                      min="1"
                      value={formData.quantidade_minima}
                      onChange={(e) => setFormData({ ...formData, quantidade_minima: parseInt(e.target.value) || 1 })}
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                    <Button type="submit">{editingItem ? "Salvar Alterações" : "Cadastrar"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <span className="text-muted-foreground">Carregando...</span>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-auto">
              <Table className="table-auto">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Código</TableHead>
                    <TableHead className="whitespace-nowrap">Equipamento</TableHead>
                    <TableHead className="max-w-[250px]">Descrição</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Qtde Mín.</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Saldo Atual</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Diferença</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Status</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItens.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        Nenhum item encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItens.map((item) => (
                      <TableRow key={item.id} className={item.status === "abaixo" ? "bg-red-50" : ""}>
                        <TableCell className="font-mono">{item.codigo}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.equipamento}</Badge>
                        </TableCell>
                        <TableCell>{item.descricao}</TableCell>
                        <TableCell className="text-center font-medium">{item.quantidade_minima}</TableCell>
                        <TableCell className="text-center">
                          <span className={item.saldoAtual < item.quantidade_minima ? "text-red-600 font-bold" : "text-green-600 font-bold"}>
                            {item.saldoAtual}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={item.diferenca < 0 ? "text-red-600 font-bold" : "text-green-600"}>
                            {item.diferenca >= 0 ? `+${item.diferenca}` : item.diferenca}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.status === "ok" ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              OK
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              Repor
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
