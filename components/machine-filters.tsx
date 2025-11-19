"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"

interface MachineFiltersProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  statusFilter: string
  onStatusFilterChange: (value: string) => void
  tipoFilter: string
  onTipoFilterChange: (value: string) => void
  localizacaoFilter: string
  onLocalizacaoFilterChange: (value: string) => void
  contratoFilter?: string
  onContratoFilterChange?: (value: string) => void
  tipos: string[]
  localizacoes: string[]
}

export function MachineFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  tipoFilter,
  onTipoFilterChange,
  localizacaoFilter,
  onLocalizacaoFilterChange,
  contratoFilter,
  onContratoFilterChange,
  tipos,
  localizacoes,
}: MachineFiltersProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar máquina..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Status</SelectItem>
            <SelectItem value="operacional">Operacional</SelectItem>
            <SelectItem value="parada">Parada</SelectItem>
            <SelectItem value="manutencao">Manutenção</SelectItem>
          </SelectContent>
        </Select>

        <Select value={tipoFilter} onValueChange={onTipoFilterChange}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Tipos</SelectItem>
            {tipos.map((tipo) => (
              <SelectItem key={tipo} value={tipo}>
                {tipo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={localizacaoFilter} onValueChange={onLocalizacaoFilterChange}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Localização" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas Localizações</SelectItem>
            {localizacoes.map((loc) => (
              <SelectItem key={loc} value={loc}>
                {loc}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {contratoFilter !== undefined && onContratoFilterChange && (
          <div className="flex items-center gap-2">
            <Label htmlFor="contrato-filter" className="text-sm font-medium whitespace-nowrap">
              Contrato:
            </Label>
            <Select value={contratoFilter} onValueChange={onContratoFilterChange}>
              <SelectTrigger id="contrato-filter" className="w-full md:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="com-contrato">Com Contrato</SelectItem>
                <SelectItem value="sem-contrato">Sem Contrato</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  )
}
