"use client"

import { useState } from "react"
import type { ContratoConfig } from "@/lib/types"
import { saveContrato, loadContrato } from "@/lib/contrato-storage"
import { clearAndResetHistory } from "@/lib/history-storage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Save, Plus, Trash2, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const TEMPLATES_STORAGE_KEY = "gestao-maquinas-templates"

interface Templates {
  tipos: string[]
  localizacoes: string[]
  statusPreventiva: string[]
  acoes: string[]
}

function loadTemplates(): Templates {
  if (typeof window !== "undefined") {
    const data = localStorage.getItem(TEMPLATES_STORAGE_KEY)
    if (data) return JSON.parse(data)
  }
  return {
    tipos: ["Compressor", "Secador", "Soprador", "Filtro - PD525", "Filtro -DD525", "Filtro DD"],
    localizacoes: [
      "Filtragem",
      "Flotação SL III",
      "Flotação",
      "Britagem",
      "Mina de Salobo",
      "Água recuperada",
      "Reservatório SLB3",
    ],
    statusPreventiva: ["OK", "Em Atraso", "Andamento", "Fora de Contrato"],
    acoes: ["ATLAS", "VALE"],
  }
}

function saveTemplates(templates: Templates) {
  if (typeof window !== "undefined") {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates))
  }
}

export function Configuracoes() {
  const [config, setConfig] = useState<ContratoConfig>(loadContrato())
  const [templates, setTemplates] = useState<Templates>(loadTemplates())
  const [newTipo, setNewTipo] = useState("")
  const [newLocalizacao, setNewLocalizacao] = useState("")
  const { toast } = useToast()

  const handleSave = () => {
    saveContrato(config)
    saveTemplates(templates)
    toast({
      title: "Configurações salvas",
      description: "As informações do contrato e templates foram atualizadas com sucesso.",
    })
  }

  const handleResetHistory = () => {
    if (
      confirm(
        "Tem certeza que deseja resetar o histórico? Isso irá recarregar os dados iniciais com suporte completo para filtros de contrato. Esta ação não pode ser desfeita.",
      )
    ) {
      clearAndResetHistory()
      toast({
        title: "Histórico resetado",
        description:
          "O histórico foi limpo e recarregado com os dados iniciais. Recarregue a página para ver as mudanças.",
      })
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    }
  }

  const addTipo = () => {
    if (newTipo.trim() && !templates.tipos.includes(newTipo.trim())) {
      setTemplates({ ...templates, tipos: [...templates.tipos, newTipo.trim()] })
      setNewTipo("")
    }
  }

  const removeTipo = (tipo: string) => {
    setTemplates({ ...templates, tipos: templates.tipos.filter((t) => t !== tipo) })
  }

  const addLocalizacao = () => {
    if (newLocalizacao.trim() && !templates.localizacoes.includes(newLocalizacao.trim())) {
      setTemplates({ ...templates, localizacoes: [...templates.localizacoes, newLocalizacao.trim()] })
      setNewLocalizacao("")
    }
  }

  const removeLocalizacao = (loc: string) => {
    setTemplates({ ...templates, localizacoes: templates.localizacoes.filter((l) => l !== loc) })
  }

  return (
    <div className="max-w-4xl space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-6">Informações do Contrato</h3>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="numero">Número do Contrato</Label>
            <Input
              id="numero"
              value={config.numero}
              onChange={(e) => setConfig({ ...config, numero: e.target.value })}
              placeholder="CT-2025-001"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="localizacao">Localização</Label>
            <Input
              id="localizacao"
              value={config.localizacao}
              onChange={(e) => setConfig({ ...config, localizacao: e.target.value })}
              placeholder="Mina de Salobo - PA"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dataInicio">Data de Início</Label>
            <Input
              id="dataInicio"
              type="date"
              value={config.dataInicio}
              onChange={(e) => setConfig({ ...config, dataInicio: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dataFim">Data de Término</Label>
            <Input
              id="dataFim"
              type="date"
              value={config.dataFim}
              onChange={(e) => setConfig({ ...config, dataFim: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fiscal">Fiscal do Contrato</Label>
            <Input
              id="fiscal"
              value={config.fiscal}
              onChange={(e) => setConfig({ ...config, fiscal: e.target.value })}
              placeholder="Nome do Fiscal"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gestora">Gestora do Contrato</Label>
            <Input
              id="gestora"
              value={config.gestora}
              onChange={(e) => setConfig({ ...config, gestora: e.target.value })}
              placeholder="Nome da Gestora"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Salvar Configurações
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-6">Templates e Nomenclaturas</h3>

        <div className="space-y-6">
          <div>
            <Label className="text-base font-medium mb-3 block">Tipos de Máquinas</Label>
            <div className="flex gap-2 mb-3">
              <Input
                value={newTipo}
                onChange={(e) => setNewTipo(e.target.value)}
                placeholder="Novo tipo de máquina"
                onKeyPress={(e) => e.key === "Enter" && addTipo()}
              />
              <Button onClick={addTipo} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {templates.tipos.map((tipo) => (
                <div key={tipo} className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-md">
                  <span className="text-sm">{tipo}</span>
                  <button onClick={() => removeTipo(tipo)} className="text-destructive hover:text-destructive/80">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-base font-medium mb-3 block">Localizações</Label>
            <div className="flex gap-2 mb-3">
              <Input
                value={newLocalizacao}
                onChange={(e) => setNewLocalizacao(e.target.value)}
                placeholder="Nova localização"
                onKeyPress={(e) => e.key === "Enter" && addLocalizacao()}
              />
              <Button onClick={addLocalizacao} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {templates.localizacoes.map((loc) => (
                <div key={loc} className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-md">
                  <span className="text-sm">{loc}</span>
                  <button onClick={() => removeLocalizacao(loc)} className="text-destructive hover:text-destructive/80">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Salvar Todas as Configurações
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Gerenciamento de Dados</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Use esta opção se os filtros de contrato nos gráficos semanais não estiverem funcionando corretamente. Isso
          irá resetar o histórico e recarregar com os dados iniciais que incluem informações completas de contrato.
        </p>
        <Button onClick={handleResetHistory} variant="destructive" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Resetar Histórico de Snapshots
        </Button>
      </Card>
    </div>
  )
}
