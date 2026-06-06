import { useEffect, useRef, useState } from 'react'

// The page's headline number, top-right: photo views + review views combined.
// Photo views keep climbing on Google in real time, so the counter ticks upward
// live — even when the review-views portion is fixed. Shown with full digits
// (commas) so you can actually watch the last figures move.
export default function TotalViews({ photoViews, reviewViews }) {
  const base = (photoViews || 0) + (reviewViews || 0)
  const [n, setN] = useState(base)
  const ref = useRef(base)

  useEffect(() => {
    ref.current = base
    setN(base)
    // a few views every tick — small, irregular, always upward
    const id = setInterval(() => {
      ref.current += 1 + Math.floor(Math.random() * 5)
      setN(ref.current)
    }, 850)
    return () => clearInterval(id)
  }, [base])

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
        {n.toLocaleString('en-US')}
      </div>
      <div className="text-xs text-[var(--color-ink-soft)] mt-1">photos + reviews · and counting</div>
    </div>
  )
}
