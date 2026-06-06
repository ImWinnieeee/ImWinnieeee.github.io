import Marquee from './Marquee.jsx'
import { formatInt, CATEGORY_META, COUNTRY_META } from '../lib.js'

// Most reacted reviews as a scrolling marquee. Reaction counts are mobile-app
// only, so these were chosen by hand — a proxy for impact beyond raw views.
function Card({ r, i }) {
  const meta = CATEGORY_META[r.category] || CATEGORY_META['Other']
  const country = COUNTRY_META[r.country]
  return (
    <a href={r.url} target="_blank" rel="noreferrer"
      className="relative block w-72 card p-4 transition hover:-translate-y-1">
      <span className="absolute -top-2 -left-2 z-10 h-8 min-w-8 px-1.5 grid place-items-center rounded-full
        bg-[var(--color-vermilion)] text-white font-display text-sm font-black shadow-md">#{i + 1}</span>
      <div className="flex gap-3">
        {r.img && <img src={r.img} alt={r.place} loading="lazy"
          className="h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-[var(--color-line)]" />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm truncate">{r.place}</span>
            {country && <span className="text-[11px] text-[var(--color-ink-soft)]">{country.flag}</span>}
          </div>
          <span className="inline-block text-[11px] px-1.5 py-0.5 rounded-full mt-0.5"
            style={{ background: meta.color + '1f', color: meta.color }}>{meta.emoji} {r.category}</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-display text-lg font-black text-[var(--color-sakura)]">❤️ {formatInt(r.reactions)}</span>
          </div>
        </div>
      </div>
      {r.why && (
        <p className="text-[11px] mt-2 leading-snug rounded-lg bg-[var(--color-paper)] px-2 py-1.5">
          <span className="font-semibold text-[var(--color-vermilion)]">💡 Why it helped: </span>
          <span className="text-[var(--color-ink)]">{r.why}</span>
        </p>
      )}
      <p className="text-xs mt-1.5 leading-snug line-clamp-2 text-[var(--color-ink-soft)]">{r.en}</p>
    </a>
  )
}

export default function TopReacted({ reviews }) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="font-display text-2xl font-bold flex items-center gap-2">
          <span className="text-2xl">❤️</span> Most Reacted Reviews
        </h2>
        <p className="text-sm text-[var(--color-ink-soft)] mt-1">People are sending their actual feedbacks with this reactions, these are rare and shows how my informative reviews help others</p>
      </div>
      <Marquee items={reviews} renderItem={(r, i) => <Card r={r} i={i} />} />
    </div>
  )
}
