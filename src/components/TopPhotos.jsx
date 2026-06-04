import { formatViews, formatInt } from '../lib.js'

// Hero block: my most-viewed photos. Photo view counts are the one view metric
// Google exposes, and they add up to millions — so this leads the page.
export default function TopPhotos({ photos, totalViews }) {
  return (
    <div className="card p-6">
      <div className="flex items-end justify-between gap-4 mb-5 flex-wrap">
        <div>
          <h2 className="font-display text-2xl font-bold flex items-center gap-2">
            <span className="text-2xl">📸</span> Most Viewed Photos
          </h2>
          <p className="text-sm text-[var(--color-ink-soft)] mt-1">
            The food photos I’ve shared have been viewed{' '}
            <span className="font-bold text-[var(--color-vermilion)]">{formatInt(totalViews)}</span> times.
          </p>
        </div>
        <div className="text-right">
          <div className="font-display text-3xl font-black text-[var(--color-vermilion)]">{formatViews(totalViews)}</div>
          <div className="text-xs text-[var(--color-ink-soft)]">total photo views</div>
        </div>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
        {photos.map((p) => (
          <a key={p.id} href={p.link || p.url} target="_blank" rel="noreferrer"
            className="group relative block overflow-hidden rounded-xl ring-1 ring-[var(--color-line)] aspect-square">
            <img
              src={p.url}
              alt="My Google Maps contribution"
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#3a322ce6] to-transparent p-2">
              <div className="text-[11px] font-bold text-white flex items-center gap-1">
                👁 {formatViews(p.views)}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
