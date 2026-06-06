import { formatViews, formatInt } from '../lib.js'

// Feature 4: headline numbers (total reviews, total views, points, photos)
function StatCard({ label, value, sub, accent, emoji, delay }) {
  return (
    <div className="card p-5 fade-up relative" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between">
        <div className="text-sm text-[var(--color-ink-soft)]">{label}</div>
        <div className="text-xl">{emoji}</div>
      </div>
      <div className="mt-2 font-display text-4xl font-black tracking-tight" style={{ color: accent }}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-[var(--color-ink-soft)]">{sub}</div>}
    </div>
  )
}

export default function StatsOverview({ stats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Photo Views" value={formatViews(stats.totalPhotoViews)} sub="times my photos were seen"
        accent="var(--color-vermilion)" emoji="👀" delay={0} />
      <StatCard label="Total Reviews" value={formatInt(stats.totalReviews)} sub="restaurants reviewed"
        accent="var(--color-indigo)" emoji="📝" delay={80} />
      <StatCard label="Photos Shared" value={formatInt(stats.photoCount)} sub="photos & videos uploaded"
        accent="var(--color-sakura)" emoji="📷" delay={160} />
      <StatCard label="Local Guide" value={`Lv. ${stats.level}`} sub={`${formatInt(stats.points)} points`}
        accent="var(--color-matcha)" emoji="🏅" delay={240} />
    </div>
  )
}
