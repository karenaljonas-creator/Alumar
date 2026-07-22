"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { SortDir } from "@/components/column-filter"

export interface TableColumnDef<T> {
  /** Identificador único da coluna */
  key: string
  /** Se a coluna é numérica (afeta ordenação dos valores no filtro e da tabela) */
  numeric?: boolean
  /** Valor exibido/agrupado da coluna para uma linha. Use "" para vazio (vira "-") */
  value: (row: T) => string
  /** Valor opcional usado APENAS para ordenar (ex.: datas ISO para ordenar corretamente) */
  sortValue?: (row: T) => string | number
}

interface UseTableFiltersArgs<T> {
  rows: T[]
  columns: TableColumnDef<T>[]
  /** Chave de persistência em localStorage */
  storageKey: string
  /** Termo de busca textual externo (input fora da tabela) */
  searchTerm?: string
  /** Predicado de busca textual (row, termoEmMinusculas) => boolean */
  searchPredicate?: (row: T, termLower: string) => boolean
}

const normaliza = (v: string | null | undefined) =>
  v === null || v === undefined || v === "" ? "-" : String(v)

/**
 * Hook genérico que adiciona filtros estilo Excel (checkbox por valor) + ordenação
 * por coluna a qualquer tabela, com contagens dinâmicas e persistência em localStorage.
 */
export function useTableFilters<T>({
  rows,
  columns,
  storageKey,
  searchTerm = "",
  searchPredicate,
}: UseTableFiltersArgs<T>) {
  // Filtros por coluna: chave presente = filtro ativo; array = valores permitidos
  const [filtros, setFiltros] = useState<Record<string, string[]>>({})
  const [ordenacao, setOrdenacao] = useState<{ key: string; dir: SortDir } | null>(null)

  const colMap = useMemo(() => {
    const m = new Map<string, TableColumnDef<T>>()
    for (const c of columns) m.set(c.key, c)
    return m
  }, [columns])

  // Restaura estado salvo
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null
      if (raw) {
        const p = JSON.parse(raw)
        if (p.filtros) setFiltros(p.filtros)
        if (p.ordenacao) setOrdenacao(p.ordenacao)
      }
    } catch {
      /* ignora estado corrompido */
    }
  }, [storageKey])

  // Persiste estado
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, JSON.stringify({ filtros, ordenacao }))
      }
    } catch {
      /* ignora falha de armazenamento */
    }
  }, [filtros, ordenacao, storageKey])

  const valor = useCallback(
    (row: T, key: string) => {
      const c = colMap.get(key)
      if (!c) return "-"
      return normaliza(c.value(row))
    },
    [colMap],
  )

  const passaBusca = useCallback(
    (row: T) => {
      const t = searchTerm.trim().toLowerCase()
      if (!t || !searchPredicate) return true
      return searchPredicate(row, t)
    },
    [searchTerm, searchPredicate],
  )

  const passaFiltros = useCallback(
    (row: T, exceto?: string) => {
      for (const key of Object.keys(filtros)) {
        if (key === exceto) continue
        const permitidos = filtros[key]
        if (!permitidos || permitidos.length === 0) continue
        if (!permitidos.includes(valor(row, key))) return false
      }
      return true
    },
    [filtros, valor],
  )

  // Universo estável de valores por coluna (sobre todas as linhas)
  const universoPorColuna = useMemo(() => {
    const mapa: Record<string, string[]> = {}
    for (const c of columns) {
      const set = new Set<string>()
      for (const r of rows) set.add(valor(r, c.key))
      const arr = Array.from(set)
      if (c.numeric) {
        arr.sort((a, b) => {
          const na = a === "-" ? Number.NEGATIVE_INFINITY : Number(a)
          const nb = b === "-" ? Number.NEGATIVE_INFINITY : Number(b)
          return na - nb
        })
      } else {
        arr.sort((a, b) => a.localeCompare(b, "pt-BR"))
      }
      mapa[c.key] = arr
    }
    return mapa
  }, [rows, columns, valor])

  // Auto-cura: remove dos filtros valores que não existem mais nos dados atuais.
  // Evita que a tabela trave vazia quando um valor filtrado deixa de existir
  // (ex.: usuário tratou/excluiu todos os itens de um determinado valor).
  useEffect(() => {
    if (rows.length === 0) return
    setFiltros((prev) => {
      let mudou = false
      const next: Record<string, string[]> = {}
      for (const key of Object.keys(prev)) {
        const selecionados = prev[key]
        if (!selecionados || selecionados.length === 0) {
          mudou = true
          continue
        }
        const universo = universoPorColuna[key] ?? []
        const validos = selecionados.filter((v) => universo.includes(v))
        if (validos.length === 0) {
          mudou = true
          continue
        }
        if (validos.length !== selecionados.length) mudou = true
        next[key] = validos
      }
      return mudou ? next : prev
    })
  }, [rows, universoPorColuna])

  // Contagem por valor, considerando os demais filtros + busca
  const contagensPorColuna = useMemo(() => {
    const mapa: Record<string, Record<string, number>> = {}
    for (const c of columns) {
      const cont: Record<string, number> = {}
      for (const r of rows) {
        if (!passaBusca(r)) continue
        if (!passaFiltros(r, c.key)) continue
        const v = valor(r, c.key)
        cont[v] = (cont[v] || 0) + 1
      }
      mapa[c.key] = cont
    }
    return mapa
  }, [rows, columns, passaBusca, passaFiltros, valor])

  // Linhas finais: busca + filtros + ordenação
  const linhas = useMemo(() => {
    const out = rows.filter((r) => passaBusca(r) && passaFiltros(r))
    if (ordenacao) {
      const c = colMap.get(ordenacao.key)
      const getSort = c?.sortValue ?? ((r: T) => valor(r, ordenacao.key))
      const numeric = !!c?.numeric
      out.sort((a, b) => {
        const sa = getSort(a)
        const sb = getSort(b)
        let cmp: number
        if (numeric || (typeof sa === "number" && typeof sb === "number")) {
          const na = sa === "-" ? Number.NEGATIVE_INFINITY : Number(sa)
          const nb = sb === "-" ? Number.NEGATIVE_INFINITY : Number(sb)
          cmp = na - nb
        } else {
          cmp = String(sa).localeCompare(String(sb), "pt-BR")
        }
        return ordenacao.dir === "asc" ? cmp : -cmp
      })
    }
    return out
  }, [rows, passaBusca, passaFiltros, ordenacao, colMap, valor])

  const setFiltroColuna = useCallback((key: string, sel: string[] | null) => {
    setFiltros((prev) => {
      const next = { ...prev }
      if (sel === null) delete next[key]
      else next[key] = sel
      return next
    })
  }, [])

  const ordenarColuna = useCallback((key: string, dir: SortDir) => {
    setOrdenacao((prev) => (prev?.key === key && prev.dir === dir ? null : { key, dir }))
  }, [])

  const limparTudo = useCallback(() => {
    setFiltros({})
    setOrdenacao(null)
  }, [])

  return {
    linhas,
    filtros,
    ordenacao,
    universoPorColuna,
    contagensPorColuna,
    setFiltroColuna,
    ordenarColuna,
    limparTudo,
    filtrosAtivos: Object.keys(filtros).length > 0 || !!ordenacao,
  }
}
