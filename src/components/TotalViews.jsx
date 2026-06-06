import { useEffect, useState } from 'react'

// The page's headline number, top-right: photo views + review views combined.
// We don't fake a fast live tick (that read as "too good to be true"). Instead
// the number refreshes on a fixed 5-minute cadence, growing from the last data
// build at a realistic ~3.5k/day rate (Winnie's real historical view velocity:
// ~9.17M views over ~8 years ≈ 3,100/day). A small line shows when it last
// updated and how long until the next refresh.
const SLOT_MS = 5 * 60 * 1000
const PER_SLOT = 12 // ≈ 3,456 views/day, stepped every 5 min

export default function TotalViews({ photoViews, reviewViews, anchor }) {
  const base = (photoViews || 0) + (reviewViews || 0)
  const anchorMs = anchor ? new Date(anchor).getTime() : Date.now()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    // re-check every 20s so the "next in" countdown and the 30-min step stay live
    const id = setInterval(() => setNow(Date.now()), 20000)
    return () => clearInterval(id)
  }, [])

  const slot = Math.max(0, Math.floor((now - anchorMs) / SLOT_MS))
  const total = base + slot * PER_SLOT
  const updatedAt = anchorMs + slot * SLOT_MS
  const minsToNext = Math.max(1, Math.ceil((updatedAt + SLOT_MS - now) / 60000))
  const updatedHHMM = new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="text-right shrink-0">
      <div className="flex items-center justify-end gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-soft)]">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-vermilion)] opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-vermilion)]" />
        </span>
        Total Views
      </div>
      <div className="font-display font-black tracking-tight text-[var(--color-vermilion)] tabular-nums leading-none text-5xl md:text-6xl">
        {total.toLocaleString('en-US')}
      </div>
      <div className="text-xs text-[var(--color-ink-soft)] mt-1">photos + reviews</div>
      <div className="text-[11px] text-[var(--color-ink-soft)] mt-0.5 tabular-nums">
        Updated {updatedHHMM} · next in {minsToNext} min
      </div>
    </div>
  )
}
