import { useRef, useEffect } from 'react'

// Horizontal carousel: drifts slowly on its own, loops seamlessly (content is
// duplicated and the scroll position wraps at the halfway point), pauses when
// you hover a card, and scrolls left/right while you hover the ‹ › arrows.
export default function Marquee({ items, renderItem, autoSpeed = 0.4 }) {
  const scrollRef = useRef(null)
  const dir = useRef(0)        // -1 / +1 while hovering an arrow
  const paused = useRef(false) // hovering a card (so you can read / click)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    let raf
    const tick = () => {
      const half = el.scrollWidth / 2
      if (half > 0) {
        let speed = dir.current !== 0 ? dir.current * 7 : paused.current ? 0 : autoSpeed
        el.scrollLeft += speed
        if (el.scrollLeft >= half) el.scrollLeft -= half
        else if (el.scrollLeft < 0) el.scrollLeft += half
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [autoSpeed])

  const nudge = (d) => { const el = scrollRef.current; if (el) el.scrollLeft += d * 320 }

  const Arrow = ({ side }) => (
    <button
      aria-label={side === 'left' ? 'Scroll left' : 'Scroll right'}
      onMouseEnter={() => (dir.current = side === 'left' ? -1 : 1)}
      onMouseLeave={() => (dir.current = 0)}
      onClick={() => nudge(side === 'left' ? -1 : 1)}
      className={`absolute top-1/2 -translate-y-1/2 z-10 ${side === 'left' ? 'left-1' : 'right-1'}
        h-9 w-9 grid place-items-center rounded-full bg-[var(--color-card)] text-[var(--color-ink)]
        border border-[var(--color-line)] shadow-md transition hover:text-[var(--color-vermilion)] hover:border-[var(--color-vermilion)]`}
    >
      {side === 'left' ? '‹' : '›'}
    </button>
  )

  return (
    <div className="relative">
      <div ref={scrollRef} className="marquee">
        <div className="flex gap-4 w-max"
          onMouseEnter={() => (paused.current = true)}
          onMouseLeave={() => (paused.current = false)}>
          {items.map((it, i) => <div key={`a-${i}`} className="shrink-0">{renderItem(it, i)}</div>)}
          {items.map((it, i) => <div key={`b-${i}`} className="shrink-0" aria-hidden="true">{renderItem(it, i)}</div>)}
        </div>
      </div>
      <Arrow side="left" />
      <Arrow side="right" />
    </div>
  )
}
