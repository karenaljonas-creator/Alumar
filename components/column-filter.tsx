"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ArrowDown, ArrowDownAZ, ArrowUp, ArrowUpAZ, ArrowUpDown, Filter, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type SortDir = "asc" | "desc"

interface ColumnFilterProps {
  /** Lista completa e estável de valores possíveis da coluna */
  options: string[]
  /** Contagem de cada valor considerando os demais filtros ativos */
  counts: Record<string, number>
  /** Valores selecionados. null = todos (sem filtro ativo) */
  selected: string[] | null
  onChange: (selected: string[] | null) => void
  sortDir: SortDir | null
  onSort: (dir: SortDir) => void
  /** Alinhamento do popover */
  align?: "start" | "center" | "end"
}

export function ColumnFilter({
  options,
  counts,
  selected,
  onChange,
  sortDir,
  onSort,
  align = "start",
}: ColumnFilterProps) {
  const [open, setOpen] = useState(false)
  const [busca, setBusca] = useState("")

  const ativo = selected !== null

  // Ciclo do ícone visível de ordenação: sem ordem → crescente → decrescente → sem ordem.
  // onSort(dir) com a mesma direção já ativa volta a "sem ordem" (toggle no componente pai).
  const cicloOrdenacao = () => {
    if (sortDir === null) onSort("asc")
    else if (sortDir === "asc") onSort("desc")
    else onSort("desc")
  }

  const tituloOrdenacao =
    sortDir === "asc" ? "Ordenado: crescente" : sortDir === "desc" ? "Ordenado: decrescente" : "Classificar coluna"

  // Valores visíveis no dropdown (filtrados pela busca interna)
  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const lista = termo ? options.filter((v) => v.toLowerCase().includes(termo)) : options
    return lista
  }, [options, busca])

  const isChecked = (v: string) => (selected === null ? true : selected.includes(v))

  const toggleValor = (v: string) => {
    let base = selected === null ? [...options] : [...selected]
    if (base.includes(v)) {
      base = base.filter((x) => x !== v)
    } else {
      base.push(v)
    }
    onChange(base.length === options.length ? null : base)
  }

  // "Selecionar todos" considera apenas os valores visíveis na busca
  const todosVisiveisMarcados = visiveis.length > 0 && visiveis.every((v) => isChecked(v))

  const toggleTodos = () => {
    if (todosVisiveisMarcados) {
      // Desmarca os visíveis
      const base = selected === null ? [...options] : [...selected]
      const next = base.filter((v) => !visiveis.includes(v))
      onChange(next.length === options.length ? null : next)
    } else {
      // Marca os visíveis
      const set = new Set(selected === null ? options : selected)
      visiveis.forEach((v) => set.add(v))
      const next = Array.from(set)
      onChange(next.length === options.length ? null : next)
    }
  }

  const limparFiltro = () => {
    onChange(null)
    setBusca("")
  }

  return (
    <span className="ml-1 inline-flex items-center">
      {/* Ícone de classificação visível direto no cabeçalho */}
      <button
        type="button"
        aria-label={tituloOrdenacao}
        title={tituloOrdenacao}
        onClick={cicloOrdenacao}
        className={cn(
          "inline-flex h-6 w-6 items-center justify-center rounded transition-colors",
          sortDir
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        {sortDir === "asc" ? (
          <ArrowUp className="h-3.5 w-3.5" />
        ) : sortDir === "desc" ? (
          <ArrowDown className="h-3.5 w-3.5" />
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5" />
        )}
      </button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Filtrar coluna"
            className={cn(
              "ml-0.5 inline-flex h-6 w-6 items-center justify-center rounded transition-colors",
              ativo
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Filter className="h-3.5 w-3.5" fill={ativo ? "currentColor" : "none"} />
          </button>
        </PopoverTrigger>
      <PopoverContent align={align} className="w-64 p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
        {/* Ordenação */}
        <div className="flex gap-1 border-b p-2">
          <Button
            variant={sortDir === "asc" ? "default" : "ghost"}
            size="sm"
            className="h-8 flex-1 justify-start gap-2 text-xs"
            onClick={() => onSort("asc")}
          >
            <ArrowUpAZ className="h-4 w-4" /> Crescente
          </Button>
          <Button
            variant={sortDir === "desc" ? "default" : "ghost"}
            size="sm"
            className="h-8 flex-1 justify-start gap-2 text-xs"
            onClick={() => onSort("desc")}
          >
            <ArrowDownAZ className="h-4 w-4" /> Decrescente
          </Button>
        </div>

        {/* Busca interna */}
        <div className="border-b p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar..."
              className="h-8 pl-7 text-xs"
            />
          </div>
        </div>

        {/* Selecionar todos */}
        <label className="flex cursor-pointer items-center gap-2 border-b px-3 py-2 text-xs font-medium hover:bg-muted">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input accent-primary"
            checked={todosVisiveisMarcados}
            onChange={toggleTodos}
          />
          (Selecionar todos)
        </label>

        {/* Lista de valores */}
        <div className="max-h-56 overflow-y-auto py-1">
          {visiveis.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">Nenhum valor</p>
          ) : (
            visiveis.map((v) => (
              <label
                key={v}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input accent-primary"
                  checked={isChecked(v)}
                  onChange={() => toggleValor(v)}
                />
                <span className="flex-1 truncate" title={v}>
                  {v}
                </span>
                <span className="tabular-nums text-muted-foreground">({counts[v] ?? 0})</span>
              </label>
            ))
          )}
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between border-t p-2">
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={limparFiltro} disabled={!ativo}>
            <X className="h-3.5 w-3.5" /> Limpar filtro
          </Button>
          <Button size="sm" className="h-8 text-xs" onClick={() => setOpen(false)}>
            Fechar
          </Button>
        </div>
        </PopoverContent>
      </Popover>
    </span>
  )
}
