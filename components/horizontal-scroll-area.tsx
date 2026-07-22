"use client"

import { useRef, useEffect, useState, type ReactNode } from "react"

/**
 * Envolve conteúdo largo (ex.: tabelas) e exibe uma barra de rolagem horizontal
 * no topo, sincronizada com a barra de baixo. Assim o usuário pode rolar
 * horizontalmente sem precisar descer até o fim da tabela.
 *
 * Funciona com o componente <Table> do shadcn, cujo wrapper interno
 * ([data-slot="table-container"]) é o elemento que realmente rola.
 */
export function HorizontalScrollArea({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const topRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollElRef = useRef<HTMLElement | null>(null)
  const [scrollWidth, setScrollWidth] = useState(0)

  useEffect(() => {
    const wrapper = containerRef.current
    if (!wrapper) return

    // O elemento que realmente rola: o container do shadcn Table, senão o próprio wrapper.
    const target =
      wrapper.querySelector<HTMLElement>("[data-slot='table-container']") ?? wrapper
    scrollElRef.current = target

    const update = () => setScrollWidth(target.scrollWidth)
    update()

    const ro = new ResizeObserver(update)
    ro.observe(target)
    if (target.firstElementChild) ro.observe(target.firstElementChild)

    const onTargetScroll = () => {
      if (topRef.current) topRef.current.scrollLeft = target.scrollLeft
    }
    target.addEventListener("scroll", onTargetScroll, { passive: true })

    return () => {
      ro.disconnect()
      target.removeEventListener("scroll", onTargetScroll)
    }
  }, [children])

  const onTopScroll = () => {
    if (scrollElRef.current && topRef.current) {
      scrollElRef.current.scrollLeft = topRef.current.scrollLeft
    }
  }

  return (
    <div className={className}>
      <div
        ref={topRef}
        onScroll={onTopScroll}
        className="overflow-x-auto overflow-y-hidden"
        aria-hidden="true"
      >
        <div style={{ width: scrollWidth, height: 1 }} />
      </div>
      <div ref={containerRef}>{children}</div>
    </div>
  )
}
