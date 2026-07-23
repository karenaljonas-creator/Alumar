"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, Building2, FileText, MapPin, Target, Loader2 } from "lucide-react"
import { getMachines, getSettings, updateSettings, getRecordCounts } from "@/lib/supabase/data-service"
import type { Machine, Settings } from "@/lib/supabase/database.types"

export function Configuracoes() {
  const [settings, setSettingsState] = useState<Settings | null>(null)
  const [machines, setMachines] = useState<Machine[]>([])
  const [weeklyRecordsCount, setWeeklyRecordsCount] = useState(0)
  const [stopsCount, setStopsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    clientName: "ALUMAR",
    contractNumber: "CT-2024-001",
    location: "São Luís - MA",
    targetAvailability: "92",
  })

  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)

      const [settingsData, machinesData, counts] = await Promise.all([
        getSettings(),
        getMachines(),
        getRecordCounts(),
      ])

      setSettingsState(settingsData)
      setMachines(machinesData)
      setWeeklyRecordsCount(counts.weeklyRecordsCount)
      setStopsCount(counts.stopsCount)

      if (settingsData) {
        setFormData({
          clientName: settingsData.client_name,
          contractNumber: settingsData.contract_number,
          location: settingsData.location,
          targetAvailability: settingsData.target_availability.toString(),
        })
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateSettings({
        client_name: formData.clientName,
        contract_number: formData.contractNumber,
        location: formData.location,
        target_availability: parseFloat(formData.targetAvailability) || 92,
      })
      setHasChanges(false)
      await loadData()
    } catch (error) {
      console.error("Erro ao salvar configurações:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (settings) {
      setFormData({
        clientName: settings.client_name,
        contractNumber: settings.contract_number,
        location: settings.location,
        targetAvailability: settings.target_availability.toString(),
      })
    }
    setHasChanges(false)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-white min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">
          Configure as informações do contrato e preferências do sistema
        </p>
      </div>

      {/* Contract Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Informações do Contrato
          </CardTitle>
          <CardDescription>
            Configure os dados básicos do cliente e contrato
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="clientName" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Nome do Cliente
              </Label>
              <Input
                id="clientName"
                value={formData.clientName}
                onChange={(e) => handleChange("clientName", e.target.value)}
                placeholder="Ex: ALUMAR"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractNumber" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Número do Contrato
              </Label>
              <Input
                id="contractNumber"
                value={formData.contractNumber}
                onChange={(e) => handleChange("contractNumber", e.target.value)}
                placeholder="Ex: CT-2024-001"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Localização
            </Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleChange("location", e.target.value)}
              placeholder="Ex: São Luís - MA"
            />
          </div>
        </CardContent>
      </Card>

      {/* Operational Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-5 w-5" />
            Configurações Operacionais
          </CardTitle>
          <CardDescription>
            Defina as metas de operação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="targetAvailability" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Meta de Disponibilidade (%)
            </Label>
            <Input
              id="targetAvailability"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={formData.targetAvailability}
              onChange={(e) => handleChange("targetAvailability", e.target.value)}
              placeholder="Ex: 92"
              className="w-[200px]"
            />
            <p className="text-xs text-muted-foreground">
              Meta contratual de disponibilidade da frota
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Data Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estatísticas de Dados</CardTitle>
          <CardDescription>
            Visão geral dos dados armazenados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Equipamentos Cadastrados</div>
              <div className="text-2xl font-bold">{machines.length}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Registros Semanais</div>
              <div className="text-2xl font-bold">{weeklyRecordsCount}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Paradas Registradas</div>
              <div className="text-2xl font-bold">{stopsCount}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Actions */}
      {hasChanges && (
        <div className="sticky bottom-6 flex justify-end gap-2">
          <Button variant="outline" onClick={handleReset}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Salvar Alterações
          </Button>
        </div>
      )}
    </div>
  )
}
