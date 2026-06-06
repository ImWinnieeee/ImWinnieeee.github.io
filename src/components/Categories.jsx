import { FAVORITE_CARDS, formatInt } from '../lib.js'

// Feature 5: my favorite places by category — 5 per category, NO ranking order.
// Each shows the store's LIVE Google rating + review count (scraped off Google
// Maps), so the picks carry real-world weight, not just my own say-so.
export default function Categories({ favorites }) {
  return (
    <div>
      <h2 className="font-display text-2xl font-bold mb-1 flex items-center gap-2">
        <span>🍽️</span> My Top Favorites
      </h2>
      <p className="text-sm text-[var(--color-ink-soft)] mb-5">
        Five places I love in each category — in no particular order. Each shows the spot’s rating and review
        count straight from Google Maps.
      </p>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {FAVORITE_CARDS.map((card) => {
          const items = favorites.filter((f) => f.category === card.label)
          return (
            <div key={card.label} className="card p-6" style={{ borderTop: `3px solid ${card.color}` }}>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-2xl">{card.emoji}</span>
                <h3 className="font-display text-lg font-bold" style={{ color: card.color }}>{card.label}</h3>
              </div>
              <ul className="space-y-3">
                {items.map((f) => {
                  const inner = (
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium truncate">{f.name}</span>
                      {f.googleRating != null ? (
                        <span className="shrink-0 text-xs whitespace-nowrap flex items-baseline gap-1">
                          <span className="font-bold" style={{ color: card.color }}>★ {f.googleRating}</span>
                          {f.googleReviews != null && (
                            <span className="text-[var(--color-ink-soft)]">({formatInt(f.googleReviews)})</span>
                          )}
                        </span>
                      ) : (
                        <span className="shrink-0 text-xs text-[var(--color-ink-soft)]">—</span>
                      )}
                    </div>
                  )
                  return (
                    <li key={f.name}>
                      {f.url ? (
                        <a href={f.url} target="_blank" rel="noreferrer" className="block hover:opacity-70 transition-opacity">
                          {inner}
                        </a>
                      ) : inner}
                    </li>
                  )
                })}
                {items.length === 0 && <li className="text-sm text-[var(--color-ink-soft)]">No picks yet</li>}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
