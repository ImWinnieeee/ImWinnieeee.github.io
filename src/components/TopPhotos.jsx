import { formatViews, formatInt } from '../lib.js'

// Hero block: my most-viewed photos AND videos, ranked together by view count.
// Photo view counts come from Google's grid; video counts are hand-supplied
// (Google doesn't expose them to scraping). Videos get a ▶ badge.
export default function TopPhotos({ photos, videos = [], totalViews }) {
  const media = [
    ...photos.map((p) => ({ ...p, src: p.url, isVideo: false })),
    ...videos.map((v) => ({ ...v, src: v.img, isVideo: true })),
  ]
    .filter((m) => m.src)
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 15)

  return (
    <div className="card p-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2.5 sm:gap-4 mb-5">
        <div className="min-w-0">
          <h2 className="font-display text-xl md:text-3xl font-bold tracking-tight flex items-center gap-2 whitespace-nowrap">
            <span className="text-xl md:text-3xl">📸</span> Most Viewed Photos &amp; Videos
          </h2>
          <p className="text-base md:text-xl font-semibold text-[var(--color-ink)]/85 mt-2 text-pretty">
            Seen{' '}
            <span className="font-black text-[var(--color-vermilion)]">{formatInt(totalViews)}</span>{' '}
            times — I’ve helped millions of people find something delicious to eat. 📸
          </p>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <div className="font-display text-2xl md:text-3xl font-black text-[var(--color-vermilion)] leading-none">{formatViews(totalViews)}</div>
          <div className="text-sm font-semibold text-[var(--color-ink)]/80 mt-0.5">total photo views</div>
        </div>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
        {media.map((m) => (
          <a key={m.id} href={m.link || m.src} target="_blank" rel="noreferrer"
            className="group relative block overflow-hidden rounded-xl ring-1 ring-[var(--color-line)] aspect-square">
            <img
              src={m.src}
              alt={m.isVideo ? `My video: ${m.place}` : 'My Google Maps contribution'}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
            {m.isVideo && (
              <div className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                ▶ video
              </div>
            )}
            {m.isVideo && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white text-sm backdrop-blur-sm transition group-hover:scale-110">▶</span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#3a322ce6] to-transparent p-2">
              <div className="text-[11px] font-bold text-white flex items-center gap-1">
                👁 {formatViews(m.views)}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
