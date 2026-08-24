import data from './data.json'
import StatsOverview from './components/StatsOverview.jsx'
import TotalViews from './components/TotalViews.jsx'
import TopPhotos from './components/TopPhotos.jsx'
import MostViewed from './components/MostViewed.jsx'
import TopReacted from './components/TopReacted.jsx'
import OwnerReplies from './components/OwnerReplies.jsx'
import MapView from './components/MapView.jsx'
import Categories from './components/Categories.jsx'
import BackToTop from './components/BackToTop.jsx'
import DataSource from './components/DataSource.jsx'

const NAV = [
  { id: 'photos', label: 'Photos' },
  { id: 'reviews', label: 'Top Reviews' },
  { id: 'impact', label: 'Impact' },
  { id: 'map', label: 'Map' },
  { id: 'categories', label: 'Favorites' },
]

export default function App() {
  const { profile, stats, topPhotos, topVideos, mostViewed, mostReacted, ownerReplies, reviews, favorites } = data
  const countryCount = new Set(reviews.map((r) => r.country)).size
  const sinceLabel = stats.dateFrom
    ? new Date(`${stats.dateFrom}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null

  return (
    <div className="min-h-full">
      <div className="grain" />
      <BackToTop />

      {stats.isMockData && (
        <div className="bg-[var(--color-vermilion)]/10 text-[var(--color-vermilion)] text-center text-sm py-2 px-4">
          ✨ Showing sample data for now — it will switch to my real Google reviews once the scraper runs.
        </div>
      )}

      {/* Hero + supporting metrics */}
      <header className="max-w-5xl mx-auto px-4 pt-6 md:pt-10 pb-6">
        <div className="relative flex flex-col items-center text-center">
          <div className="self-end text-right text-[10px] sm:text-xs font-medium leading-snug text-[var(--color-ink-soft)] tabular-nums md:absolute md:right-0 md:top-0">
            <div>Number Updated at</div>
            <div className="mt-0.5">{new Date(stats.updatedAt).toLocaleString('en-US', {
              year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}</div>
          </div>

          <div className="mt-3 md:mt-0 text-2xl sm:text-3xl tracking-widest">🍣 🍝 🍜 🍰 🧋</div>
          <div className="mt-3 inline-flex flex-col items-center sm:relative sm:block">
            <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight leading-tight">
              {profile.name}
            </h1>
            {sinceLabel && (
              <span className="mt-1 text-xs font-semibold text-[var(--color-ink-soft)] sm:absolute sm:left-full sm:bottom-1 sm:ml-3 sm:whitespace-nowrap">
                Since {sinceLabel}
              </span>
            )}
          </div>
          <div className="h-1.5 w-16 rounded-full bg-[var(--color-vermilion)] mt-3 mb-5" />

          <TotalViews
            photoViews={stats.totalPhotoViews}
            reviewViews={stats.totalReviewViews}
            dateFrom={stats.dateFrom}
            updatedAt={stats.updatedAt}
            countryCount={countryCount}
          />
        </div>

        <div className="mt-7 md:mt-9">
          <StatsOverview stats={stats} />
        </div>

        <nav aria-label="Page sections" className="mt-5 flex flex-wrap justify-center gap-2.5">
          {NAV.map((n) => (
            <a key={n.id} href={`#${n.id}`} className="btn-round text-sm">{n.label}</a>
          ))}
          <a href={profile.profileUrl} target="_blank" rel="noreferrer" className="btn-round is-active text-sm">
            See my Google reviews →
          </a>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-4 pb-24 space-y-10">
        {/* 2. Hero: most viewed photos (9M+ views) */}
        <section id="photos" className="scroll-mt-6">
          <TopPhotos photos={topPhotos} videos={topVideos} totalViews={stats.totalPhotoViews} />
        </section>

        {/* 1. Most viewed reviews (bilingual marquee) */}
        <section id="reviews" className="scroll-mt-6">
          <MostViewed reviews={mostViewed} />
        </section>

        {/* Most reacted reviews (marquee) */}
        <div id="impact" className="scroll-mt-6"><TopReacted reviews={mostReacted} /></div>

        {/* Businesses that personally replied */}
        <section>
          <OwnerReplies replies={ownerReplies} />
        </section>

        {/* 3. Map with country tabs */}
        <section id="map" className="scroll-mt-6">
          <MapView reviews={reviews} />
        </section>

        {/* 5. Favorite categories */}
        <section id="categories" className="scroll-mt-6">
          <Categories favorites={favorites} />
        </section>

        <footer className="text-center text-xs text-[var(--color-ink-soft)] pt-8">
          <div>Handcrafted with React + Vite + Tailwind · Data scraped from my Google Maps Local Guide contributions</div>
          <DataSource />
        </footer>
      </main>
    </div>
  )
}
