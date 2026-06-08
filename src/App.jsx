import data from './data.json'
import { formatViews } from './lib.js'
import StatsOverview from './components/StatsOverview.jsx'
import TotalViews from './components/TotalViews.jsx'
import TopPhotos from './components/TopPhotos.jsx'
import MostViewed from './components/MostViewed.jsx'
import TopReacted from './components/TopReacted.jsx'
import OwnerReplies from './components/OwnerReplies.jsx'
import MapView from './components/MapView.jsx'
import Categories from './components/Categories.jsx'
import SideNote from './components/SideNote.jsx'

const NAV = [
  { id: 'photos', label: 'Photos' },
  { id: 'reviews', label: 'Top Reviews' },
  { id: 'impact', label: 'Impact' },
  { id: 'map', label: 'Map' },
  { id: 'categories', label: 'Favorites' },
]

export default function App() {
  const { profile, stats, topPhotos, topVideos, mostViewed, mostReacted, ownerReplies, reviews, favorites } = data

  return (
    <div className="min-h-full">
      <div className="grain" />

      {stats.isMockData && (
        <div className="bg-[var(--color-vermilion)]/10 text-[var(--color-vermilion)] text-center text-sm py-2 px-4">
          ✨ Showing sample data for now — it will switch to my real Google reviews once the scraper runs.
        </div>
      )}

      {/* Header */}
      <header className="max-w-5xl mx-auto px-4 pt-12 pb-4">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-3xl tracking-widest mb-3">🍣 🍝 🍜 🍰 🧋</div>
            <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight leading-tight">
              {profile.name}
            </h1>
            <div className="h-1.5 w-16 rounded-full bg-[var(--color-vermilion)] my-3" />
          </div>
          <TotalViews photoViews={stats.totalPhotoViews} reviewViews={stats.totalReviewViews} updatedAt={stats.updatedAt} />
        </div>
        <p className="text-[var(--color-ink-soft)]">
          {profile.level} · {formatViews(stats.totalPhotoViews)} photo views across{' '}
          {new Set(reviews.map((r) => r.country)).size} countries · Updated from {stats.dateFrom} to {stats.dateTo}
        </p>
        <p className="text-xs text-[var(--color-ink-soft)] mt-1.5 max-w-2xl">
          The data on this site comes from Winnie’s personal Google Maps profile, built into this website by Winnie and her Claude Code.
        </p>

        <div className="mt-5 flex flex-wrap gap-2.5">
          {NAV.map((n) => (
            <a key={n.id} href={`#${n.id}`} className="btn-round text-sm">{n.label}</a>
          ))}
          <a href={profile.profileUrl} target="_blank" rel="noreferrer" className="btn-round is-active text-sm">
            See my Google reviews →
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pb-24 space-y-10">
        {/* 4. Headline numbers */}
        <StatsOverview stats={stats} />

        {/* 2. Hero: most viewed photos (9M+ views) */}
        <section id="photos" className="relative scroll-mt-6">
          <TopPhotos photos={topPhotos} videos={topVideos} totalViews={stats.totalPhotoViews} />
          <SideNote side="right" accent="var(--color-vermilion)">
            It makes me feel <b>AWESOME</b> to see so many of my pictures get so many views! I'm sharing useful pics! 📸
          </SideNote>
        </section>

        {/* 1. Most viewed reviews (bilingual marquee) */}
        <section id="reviews" className="relative scroll-mt-6">
          <MostViewed reviews={mostViewed} />
          <SideNote side="left" accent="var(--color-indigo)">
            Where I truly feel myself important! People are actually telling me they think my reviews are great! ✨
          </SideNote>
        </section>

        {/* Most reacted reviews (marquee) */}
        <div id="impact" className="scroll-mt-6"><TopReacted reviews={mostReacted} /></div>

        {/* Businesses that personally replied */}
        <section className="relative">
          <OwnerReplies replies={ownerReplies} />
          <SideNote side="right" accent="var(--color-matcha)">
            Even the store owners appreciate me for my detailed reviews! Helping them add useful info onto Google Maps — where so many potential customers look — is something I really enjoy. 💬
          </SideNote>
        </section>

        {/* 3. Map with country tabs */}
        <section id="map" className="relative scroll-mt-6">
          <MapView reviews={reviews} />
          <SideNote side="left" accent="var(--color-sakura)">
            Trying to impact more people around the world with my Google reviews! 🌏
          </SideNote>
        </section>

        {/* 5. Favorite categories */}
        <section id="categories" className="relative scroll-mt-6">
          <Categories favorites={favorites} />
          <SideNote side="right" accent="var(--color-vermilion)">
            One of the best feelings is recommending a restaurant to my friends — they try it and love it too! 🍽️
          </SideNote>
        </section>

        <footer className="text-center text-xs text-[var(--color-ink-soft)] pt-8">
          Handcrafted with React + Vite + Tailwind · Data scraped from my Google Maps Local Guide contributions
        </footer>
      </main>
    </div>
  )
}
