import { useState } from 'react'
import { FAVORITE_CARDS, COUNTRY_META, formatInt } from '../lib.js'

// Feature 5: my favorite places by category — 5 per category, NO ranking order.
// Each shows the store's LIVE Google rating + review count (scraped off Google
// Maps), so the picks carry real-world weight, not just my own say-so.
// Hovering (desktop) / tapping (mobile) a store name pops a little note with
// what to order + my short verdict (from build-data.mjs → f.note).
function FavRow({ f, color }) {
  const [tapped, setTapped] = useState(false) // 手機點一下展開
  const [hovered, setHovered] = useState(false) // 桌機游標停留
  const hasNote = !!f.note
  const flag = COUNTRY_META[f.country]?.flag

  const inner = (
    <div className="flex items-baseline justify-between gap-2">
      <span className="font-medium truncate">
        {flag && <span className="mr-1">{flag}</span>}
        {f.name}
        {hasNote && <span className="ml-1 align-middle text-xs text-[var(--color-ink-soft)]">ⓘ</span>}
      </span>
      {f.googleRating != null ? (
        <span className="shrink-0 text-xs whitespace-nowrap flex items-baseline gap-1">
          <span className="font-bold" style={{ color }}>★ {f.googleRating}</span>
          {f.googleReviews != null && (
            <span className="text-[var(--color-ink-soft)]">({formatInt(f.googleReviews)})</span>
          )}
        </span>
      ) : (
        <span className="shrink-0 text-xs text-[var(--color-ink-soft)]">—</span>
      )}
    </div>
  )

  // 沒有短評的店：維持原本行為（直接連到 Google Maps）
  if (!hasNote) {
    return (
      <li>
        {f.url ? (
          <a href={f.url} target="_blank" rel="noreferrer" className="block hover:opacity-70 transition-opacity">
            {inner}
          </a>
        ) : inner}
      </li>
    )
  }

  const open = tapped || hovered
  return (
    <li
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={() => setTapped((s) => !s)}
        aria-expanded={open}
        className="block w-full text-left cursor-help hover:opacity-70 transition-opacity"
      >
        {inner}
      </button>
      {open && (
        // pb-2 製造視覺間距，但它本身仍是 li 的子孫 → 游標從店名往上移到提示框不會中斷 hover
        <div className="absolute bottom-full left-0 z-30 w-72 max-w-[80vw] pb-2">
          <div className="card p-3 shadow-lg" style={{ borderTop: `3px solid ${color}` }}>
            <p className="text-sm leading-snug text-[var(--color-ink)]">{f.note}</p>
            {f.url && (
              <a
                href={f.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-xs font-semibold"
                style={{ color }}
              >
                View on Google Maps →
              </a>
            )}
          </div>
        </div>
      )}
    </li>
  )
}

export default function Categories({ favorites }) {
  return (
    <div>
      <h2 className="font-display text-lg md:text-3xl font-bold mb-1.5 flex items-center gap-2">
        <span className="text-lg md:text-3xl">🍽️</span> My Top Favorites
      </h2>
      <p className="text-lg md:text-xl font-semibold text-[var(--color-ink)]/85 mb-5">
        I’m always the one who picks the restaurant when we eat out with friends. I love hunting down new
        places and trying new food, and this is the pocket list I give to my friends.
      </p>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {FAVORITE_CARDS.map((card) => {
          const items = favorites.filter((f) => f.category === card.label)
          return (
            <div key={card.label} className="card p-6" style={{ borderTop: `3px solid ${card.color}` }}>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-2xl">{card.emoji}</span>
                <h3 className="font-display text-xl font-bold" style={{ color: card.color }}>{card.label}</h3>
              </div>
              <ul className="space-y-3">
                {items.map((f) => <FavRow key={f.name} f={f} color={card.color} />)}
                {items.length === 0 && <li className="text-sm text-[var(--color-ink-soft)]">No picks yet</li>}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
