import { useState, useMemo, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import { CATEGORY_META, COUNTRY_META, formatViews } from '../lib.js'

// Re-fit the map to the selected country/city's markers whenever the selection
// changes. A single pin (e.g. drilling into a one-review city) zooms in close.
function FitBounds({ pts, boundsKey }) {
  const map = useMap()
  useEffect(() => {
    if (!pts.length) return
    if (pts.length === 1) {
      map.setView([pts[0].lat, pts[0].lng], 16)
    } else {
      map.fitBounds(pts.map((p) => [p.lat, p.lng]), { padding: [40, 40] })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundsKey])
  return null
}

// Feature 3 (+ country tabs): a map of everywhere I've reviewed, split by country
export default function MapView({ reviews }) {
  const pts = useMemo(() => reviews.filter((r) => r.lat && r.lng), [reviews])

  // countries present, with counts, most-reviewed first
  const countries = useMemo(() => {
    const m = {}
    pts.forEach((r) => { const c = r.country || 'Other'; m[c] = (m[c] || 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([country, count]) => ({ country, count }))
  }, [pts])

  const [active, setActive] = useState(countries[0]?.country)
  const [activeRegion, setActiveRegion] = useState(null) // null = whole country
  // a tapped pin (touch only). On touch there's no hover, so the 1st tap just
  // previews (shows the tooltip); only a 2nd tap on the same pin opens the review.
  const [activePin, setActivePin] = useState(null)
  const [activeCat, setActiveCat] = useState(null) // place-type filter (null = show all, full colour)
  const [canHover, setCanHover] = useState(true)
  useEffect(() => { setCanHover(window.matchMedia?.('(hover: hover)').matches ?? true) }, [])

  // switching country always resets the city drill-down (and any tapped pin / filter)
  const selectCountry = (country) => { setActive(country); setActiveRegion(null); setActivePin(null); setActiveCat(null) }

  const inCountry = useMemo(() => pts.filter((r) => r.country === active), [pts, active])

  // region (city) breakdown for the active country — used as drill-down tabs
  const regions = useMemo(() => {
    const m = {}
    inCountry.forEach((r) => { const g = r.region || '—'; m[g] = (m[g] || 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [inCountry])

  // pins actually drawn: the country, narrowed to a city when one is picked
  const shown = useMemo(
    () => (activeRegion ? inCountry.filter((r) => (r.region || '—') === activeRegion) : inCountry),
    [inCountry, activeRegion]
  )

  // the place types actually present in the current view — these become the filter chips
  const catsPresent = useMemo(
    () => Object.keys(CATEGORY_META).filter((name) => shown.some((r) => r.category === name)),
    [shown]
  )

  const center = shown.length ? [shown[0].lat, shown[0].lng] : [25.04, 121.54]

  return (
    <div className="card p-6">
      <h2 className="font-display text-lg md:text-3xl font-bold flex items-center gap-2 mb-1.5">
        <span className="text-lg md:text-3xl">🗺️</span>
        Where I've Eaten Around the World
      </h2>
      <p className="text-lg md:text-xl font-semibold text-[var(--color-ink)]/85 mb-4">Hoping to help travelers around the world with my honest and informative words!</p>

      {/* Country tabs */}
      <div className="flex flex-wrap gap-2.5 mb-3">
        {countries.map(({ country, count }) => {
          const meta = COUNTRY_META[country] || { flag: '📍', label: country }
          const isActive = active === country
          return (
            <button key={country} onClick={() => selectCountry(country)}
              className={`btn-round text-sm ${isActive ? 'is-active' : ''}`}>
              <span className="text-base">{meta.flag}</span> {meta.label}
              <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-xs font-bold"
                style={{ background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--color-paper)' }}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* City drill-down: click a city to zoom into just its pins */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {regions.map(([g, n]) => {
          const on = activeRegion === g
          return (
            <button key={g}
              onClick={() => { setActiveRegion(on ? null : g); setActiveCat(null) }}
              aria-pressed={on}
              className={`btn-round text-xs !py-1 !px-3 ${on ? 'is-active' : ''}`}>
              {g} <span className="opacity-70">· {n}</span>
            </button>
          )
        })}
        {activeRegion && (
          <button onClick={() => setActiveRegion(null)}
            className="text-xs text-[var(--color-vermilion)] underline underline-offset-2 ml-0.5">
            show all cities
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl ring-1 ring-[var(--color-line)]" style={{ height: 420 }}>
        <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; OpenStreetMap, &copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <FitBounds pts={shown} boundsKey={`${active}|${activeRegion || ''}`} />
          {shown.map((r) => {
            const meta = CATEGORY_META[r.category] || CATEGORY_META['Other']
            const isActive = activePin === r.id
            const dimmed = activeCat && r.category !== activeCat // faded when a different type is filtered
            const open = () => r.url && window.open(r.url, '_blank', 'noopener')
            return (
              <CircleMarker
                key={r.id}
                center={[r.lat, r.lng]}
                radius={isActive ? 11 : dimmed ? 6 : 9}
                pathOptions={{ color: '#fff', fillColor: dimmed ? '#b3a896' : meta.color, fillOpacity: dimmed ? 0.3 : 0.9, weight: isActive ? 3.5 : 2.5, opacity: dimmed ? 0.5 : 1 }}
                eventHandlers={{
                  click: () => {
                    // desktop (hover) opens right away; touch needs a 1st tap to
                    // preview and a 2nd tap on the same pin to actually open.
                    if (canHover) open()
                    else if (isActive) open()
                    else setActivePin(r.id)
                  },
                }}
              >
                <Tooltip permanent={!canHover && isActive} className="pin-tip">
                  <strong>{meta.emoji} {r.place}</strong>
                  <br />
                  {r.region} · {'★'.repeat(r.rating || 0)}
                  {r.url && <><br /><span
                    onClick={(e) => { e.stopPropagation(); open() }}
                    style={{ color: 'var(--color-vermilion)', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}>
                    → open my review
                  </span></>}
                </Tooltip>
              </CircleMarker>
            )
          })}
        </MapContainer>
      </div>

      {/* Legend doubles as a place-type filter: tap a type to spotlight it
          (other pins fade out); tap again / "show all" to reset. */}
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-soft)]">Place type</span>
          {activeCat
            ? <button onClick={() => setActiveCat(null)} className="text-[11px] text-[var(--color-vermilion)] underline underline-offset-2">show all</button>
            : <span className="text-[11px] text-[var(--color-ink-soft)]/70">· tap to filter</span>}
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {catsPresent.map((name) => {
            const m = CATEGORY_META[name]
            const on = activeCat === name
            const dim = activeCat && !on
            return (
              <button key={name}
                onClick={() => setActiveCat(on ? null : name)}
                aria-pressed={on}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition
                  ${on ? 'border-transparent text-white shadow-sm' : 'border-[var(--color-line)] bg-[var(--color-paper)] text-[var(--color-ink-soft)]'}
                  ${dim ? 'opacity-40' : ''}`}
                style={on ? { background: m.color } : undefined}>
                <span className="inline-block h-3 w-3 rounded-full" style={{ background: on ? '#fff' : m.color }} />
                {m.emoji} {name}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
