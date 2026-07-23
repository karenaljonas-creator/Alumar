"use client"

import { useState, useEffect } from "react"
import { Loader2, TrendingUp, AlertTriangle, CheckCircle2, XCircle, FileCheck } from "lucide-react"
import { getMachines, getSettings, getWeeklySnapshots } from "@/lib/supabase/data-service"
import type { Machine, Settings as SettingsType } from "@/lib/supabase/database.types"
import type { WeeklySnapshot } from "@/lib/supabase/data-service"

export function Dashboard() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [settings, setSettings] = useState<SettingsType | null>(null)
  const [snapshots, setSnapshots] = useState<WeeklySnapshot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [machinesData, settingsData, snapshotsData] = await Promise.all([
        getMachines(),
        getSettings(),
        getWeeklySnapshots(),
      ])
      setMachines(machinesData)
      setSettings(settingsData)
      setSnapshots(snapshotsData || [])
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
    } finally {
      setLoading(false)
    }
  }

  const activeMachines = machines.filter(m => m.status !== "desativado")
  const stats = {
    totalMachines: machines.length,
    operatingMachines: machines.filter(m => m.status === "operacional").length,
    stoppedMachines: machines.filter(m => m.status === "parado").length,
    desativadosMachines: machines.filter(m => m.status === "desativado").length,
    inContractMachines: machines.filter(m => m.in_contract).length,
    outOfContractMachines: machines.filter(m => !m.in_contract).length,
    targetAvailability: settings?.target_availability || 92,
    totalAtivas: activeMachines.length,
  }

  const latestSnapshot = snapshots[0]
  const availability = latestSnapshot 
    ? latestSnapshot.disponibilidade 
    : (stats.totalAtivas > 0 
        ? Math.round((stats.operatingMachines / stats.totalAtivas) * 1000) / 10
        : 0)

  const recentSnapshots = snapshots.slice(0, 12).reverse()

  const areaStats = [...new Set(machines.map(m => m.area))].map(area => {
    const areaMachines = machines.filter(m => m.area === area && m.status !== "desativado")
    const operating = areaMachines.filter(m => m.status === "operacional").length
    const stopped = areaMachines.filter(m => m.status === "parado").length
    const total = areaMachines.length
    return {
      area,
      operating,
      stopped,
      total,
      availability: total > 0 ? Math.round((operating / total) * 100) : 0,
    }
  })

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-white min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-6 space-y-6">
      
      {/* ========== SECTION: PRINCIPAIS KPIs ========== */}
      <section>
        <h2 className="text-gray-700 text-sm font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Principais KPIs
        </h2>
        <div className="grid grid-cols-6 gap-4">
          {/* Total */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">TOTAL</div>
            <div className="text-4xl font-bold text-gray-800">{stats.totalMachines}</div>
            <div className="text-xs text-gray-400 mt-1">Equipamentos</div>
          </div>
          
          {/* Operando */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">OPERANDO</div>
            <div className="text-4xl font-bold text-[#0099cc]">{stats.operatingMachines}</div>
            <div className="text-xs text-gray-400 mt-1">Em operacao</div>
          </div>
          
          {/* Paradas */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">PARADAS</div>
            <div className="text-4xl font-bold text-red-500">{stats.stoppedMachines}</div>
            <div className="text-xs text-gray-400 mt-1">Fora de operacao</div>
          </div>
          
          {/* Disponibilidade */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">DISPONIBILIDADE</div>
            <div className="text-4xl font-bold text-[#0099cc]">{availability}%</div>
            <div className="text-xs text-gray-400 mt-1">Meta: {stats.targetAvailability}%</div>
          </div>
          
          {/* Meta */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">STATUS META</div>
            <div className={`text-4xl font-bold ${availability >= stats.targetAvailability ? "text-emerald-500" : "text-amber-500"}`}>
              {availability >= stats.targetAvailability ? "OK" : "BAIXA"}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {availability >= stats.targetAvailability ? "Atingida" : "Nao atingida"}
            </div>
          </div>
        </div>
      </section>

      {/* ========== SECTION: DISPONIBILIDADE E STATUS ========== */}
      <section className="grid grid-cols-12 gap-6">
        
        {/* Grafico de Disponibilidade */}
        <div className="col-span-7 bg-gray-50 rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 className="text-gray-700 text-sm font-semibold mb-4">
            Historico de Disponibilidade 
            <span className="font-normal text-gray-400 ml-2">({snapshots.length} registros)</span>
          </h3>
          
          <div className="relative flex items-end gap-1 h-48 mb-4 bg-gray-100 rounded-lg p-2">
            {/* Linha de Meta */}
            <div 
              className="absolute left-0 right-0 border-t-2 border-dashed border-red-400 z-10"
              style={{ bottom: `${(stats.targetAvailability / 100) * 176 + 8}px` }}
            >
              <span className="absolute -top-3 right-2 text-[10px] text-red-400 bg-gray-100 px-1">
                Meta {stats.targetAvailability}%
              </span>
            </div>
            
            {recentSnapshots.length > 0 ? (
              recentSnapshots.map((snapshot) => {
                const isGood = snapshot.disponibilidade >= stats.targetAvailability
                const heightPx = Math.max(20, Math.round((snapshot.disponibilidade / 100) * 176))
                return (
                  <div 
                    key={snapshot.id} 
                    className="flex-1 flex flex-col justify-end h-full"
                  >
                    <div
                      className={`w-full rounded-t-sm ${isGood ? "bg-[#0099cc]" : "bg-amber-500"}`}
                      style={{ height: `${heightPx}px` }}
                      title={`${snapshot.week_code}: ${snapshot.disponibilidade}%`}
                    />
                  </div>
                )
              })
            ) : (
              <div className="flex-1 flex items-center justify-center h-full text-gray-400 text-sm">
                Nenhum registro semanal enviado ainda
              </div>
            )}
          </div>
          
          <div className="flex justify-between text-xs text-gray-400 mb-4">
            <span>Registros anteriores</span>
            <span>Atual</span>
          </div>
          
          <div className="flex items-center gap-6 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-amber-500" />
              <span>Abaixo da meta ({"<"}{stats.targetAvailability}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-[#0099cc]" />
              <span>Meta atingida ({">="}{stats.targetAvailability}%)</span>
            </div>
          </div>
        </div>

        {/* Status Contrato e Operacional */}
        <div className="col-span-5 space-y-4">
          
          {/* Status do Contrato */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-gray-700 text-sm font-semibold mb-4 flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              Status do Contrato
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-[#0099cc] rounded-lg px-4 py-3">
                <span className="text-white text-sm font-medium">Em Contrato</span>
                <span className="text-white text-2xl font-bold">{stats.inContractMachines}</span>
              </div>
              <div className="flex items-center justify-between bg-amber-500 rounded-lg px-4 py-3">
                <span className="text-white text-sm font-medium">Fora Contrato</span>
                <span className="text-white text-2xl font-bold">{stats.outOfContractMachines}</span>
              </div>
            </div>
          </div>

          {/* Status Operacional */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-gray-700 text-sm font-semibold mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Status Operacional
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#0099cc]" />
                  <span className="text-gray-600 text-sm">Operando</span>
                </div>
                <span className="text-[#0099cc] text-xl font-bold">{stats.operatingMachines}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-gray-600 text-sm">Paradas</span>
                </div>
                <span className="text-red-500 text-xl font-bold">{stats.stoppedMachines}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600 text-sm">Desativadas</span>
                </div>
                <span className="text-gray-400 text-xl font-bold">{stats.desativadosMachines}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== SECTION: VISAO POR AREA ========== */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-gray-700 text-sm font-semibold">Disponibilidade por Area</h2>
          <button className="text-xs text-[#0099cc] hover:underline">Ver detalhes &rarr;</button>
        </div>
        <div className="grid grid-cols-5 gap-4">
          {areaStats.map((area) => (
            <div 
              key={area.area}
              className="bg-gray-50 rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-xs text-gray-400 mb-2 truncate">{area.area}</div>
              <div className={`text-3xl font-bold mb-2 ${
                area.availability >= stats.targetAvailability ? "text-[#0099cc]" : "text-amber-500"
              }`}>
                {area.availability}%
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-[#0099cc]" />
                  {area.operating}
                </span>
                <span className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  {area.stopped}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}
