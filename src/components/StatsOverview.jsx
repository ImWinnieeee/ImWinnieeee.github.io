import { formatViews, formatInt } from '../lib.js'

// Feature 4: headline numbers (total reviews, total views, points, photos)
function StatCard({ label, value, sub, accent, emoji, delay }) {
  return (
    <div className="card p-4 md:p-5 fade-up relative flex items-center justify-between gap-3
      md:flex-col md:items-stretch md:justify-start md:gap-0" style={{ animationDelay: `${delay}ms` }}>
      {/* mobile: left side · desktop: top row (emoji pushed right) */}
      <div className="flex items-center gap-2.5 md:justify-between">
        <span className="text-2xl md:order-last">{emoji}</span>
        <span className="font-display text-base md:text-xl font-bold text-[var(--color-ink)] leading-tight">{label}</span>
      </div>
      {/* mobile: right side · desktop: below */}
      <div className="text-right md:text-left shrink-0 md:mt-2">
        <div className="font-display text-2xl md:text-4xl font-black tracking-tight leading-none" style={{ color: accent }}>
          {value}
        </div>
        {sub && <div className="mt-0.5 md:mt-1 text-xs md:text-base font-medium text-[var(--color-ink)]/85">{sub}</div>}
      </div>
    </div>
  )
}

export default function StatsOverview({ stats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
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
