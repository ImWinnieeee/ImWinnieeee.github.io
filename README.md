# Winnie's Food Map 🍣🍝🍜

A personal dashboard that turns my **Google Maps Local Guide** contributions into a
showcase: which reviews and photos got the most views, where in the world I've
eaten, and the businesses that personally wrote back to me.

Built as an AI-assisted side project — the whole thing (scraper → data pipeline →
React site) was designed and coded with Claude.

- **386 reviews** across Taiwan, Japan, Italy & Thailand
- **9.2 million photo views** (11.8M including review views)
- Local Guide **Level 8** · 16,991 points

---

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React 19 + Vite 6 |
| Styling | Tailwind CSS v4 (`@theme` design tokens, warm Japanese-minimalist palette) |
| Map | Leaflet + react-leaflet v5 (CartoDB light tiles) |
| Scraper | Playwright (Chromium over CDP) |
| Geocoding | OpenStreetMap Nominatim |
| Data | A single static `src/data.json` (no backend) |

---

## Quick start

```bash
npm install
npm run dev        # → http://localhost:5173
npm run build      # production build to dist/
```

The site reads everything from `src/data.json`, so it runs without any backend or
API keys.

---

## How the data gets in

Google does **not** offer an API for your own contribution stats, so the numbers
are gathered with a small Playwright scraper and a few build steps. The flow:

```
        ┌─ npm run login ──┐   open my real Chrome, sign in once
        │                  │   (Google blocks login inside automated browsers,
        │                  │    so we drive the real Chrome over a debug port)
        ▼
   ┌─────────────────┐
   │  npm run scrape │  connect to that Chrome, scroll the whole
   └────────┬────────┘  Reviews + Photos feed, harvest while scrolling
            │           (the feed is virtualized — only ~10 cards exist at a
            │            time — so we accumulate by id across scroll steps)
            ▼
   scraper/output/reviews-raw.json   ← place, address, stars, text, photos, owner replies
   scraper/output/photos-raw.json    ← every photo's view count (+ the multi-million total)
   scraper/output/video-views.json   ← per-video view counts (from the grid 👁 badge)
   scraper/output/stats.json         ← level, points
            │
            ▼
   ┌────────────────┐
   │ npm run parse  │  reviews-raw → structured records:
   └───────┬────────┘  country/region, star rating, date, cleaned text,
           │           owner-reply preview, best-guess food category
           ▼
   scraper/output/reviews-parsed.json
           │
           ▼
   ┌──────────────────┐
   │ npm run geocode  │  turn each address into lat/lng via Nominatim,
   └────────┬─────────┘  cached in geocode-cache.json (city-centre fallback)
            │
            ▼
   ┌────────────────────┐
   │ npm run build:data │  assemble the final site data + my English
   └─────────┬──────────┘  translations of the featured reviews
             ▼
        src/data.json   →  the React app renders this
```

### 🔄 Refreshing the site

After writing new Google reviews / uploading photos, leave your logged-in Chrome
window open and run **one** command. Which one depends on what you want:

| Command | What it does | What it commits | Goes live? |
|---------|--------------|-----------------|------------|
| `npm run refresh` | **Pure data update.** scrape → parse → build:data, then auto-commits & pushes **only `src/data.json`** with message `<date> data update` | only `src/data.json` | ✅ yes (auto) |
| `npm run update:site` | **Everything live.** Same scrape + a full `build`, then `git add -A` → commit → push (sweeps up **all** working-tree changes) | all changes (`git add -A`) | ✅ yes (auto) |
| `npm run build:all` | scrape → parse → build:data → build, **local only** | nothing | ❌ no |

**👉 If you just want to update the numbers (views, counts, ratings) — `npm run refresh` is all you need.**
It fetches your latest Google Maps data, commits only `src/data.json`, pushes, and
GitHub Actions auto-deploys. It deliberately leaves any other edits (components,
styling, scraper tweaks) in your working tree — they will **not** be swept onto the
live site. Use `npm run update:site` instead when you *do* want those other changes
deployed too.

```bash
npm run login     # ONLY the first time, or if the saved Chrome session expired —
                  # leave that Chrome window open. (refresh / update:site will also
                  # open it for you automatically if it isn't running.)
   # pure data update → auto commit (src/data.json only) → push → deploy
```

Under the hood `refresh` / `update:site` run these in order (chained so that if one
fails — e.g. Chrome isn't open — the rest **stop**, never overwriting good data with
a half-finished scrape):

```bash
npm run scrape       # 1. harvest reviews, photos, photo + VIDEO view counts, store ratings
npm run parse        # 2. raw reviews → structured records
npm run build:data   # 3. assemble src/data.json (the numbers update HERE)
npm run build        # 4. rebuild dist/ — update:site only; the deploy CI rebuilds anyway,
                     #    so refresh skips this (numbers already live after step 3)
```

> **What updates automatically:** photo view counts (per-photo + the multi-million
> total), total photo/video count, total reviews, per-video view counts, Google
> store ratings, and the photos + reviews headline number. The review-views slice
> is recalculated during every refresh: the phone total entered for that run minus
> the photo/video views scraped during the same run. It is never treated as a fixed
> number when a valid new phone total is supplied.

**Optional / occasional steps** (not in `refresh`):

```bash
npm run geocode             # only when new reviews need map pins resolved (Nominatim)
npm run scrape:videoviews   # re-grab ONLY the video view counts (a quick grid sweep)
npm run scrape:videoframes  # re-grab the video still thumbnails
```

### Hand-supplied numbers
Two things are **not** scrapable from Google's desktop web and are entered by hand
into `scraper/output/views_and_reactions.csv`:

- **per-review view counts** (Google only shows these in the mobile app)
- **per-review reaction counts** (likewise mobile-only)

`build:data` matches those rows to the scraped reviews by store name to build the
"Most Viewed" and "Most Reacted" sections. Everything else — photo views, **per-video
view counts** (read from the grid's 👁 badge), totals, text, photos, owner replies,
store ratings, the map — is scraped automatically.

> **Per-video views used to be hand-typed**, but Google does expose them in the photo
> grid (a video tile = one with a duration like `0:07`; its count sits in a `.HtPsUd`
> badge). `scrape.mjs` now harvests them → `video-views.json`, and `build-data.mjs`
> pins each featured video to its photo id so the count auto-updates.

> ⚠️ **If a refresh ever shows 0 photos/videos:** Google occasionally changes the
> grid's HTML. The scraper currently expects tiles as `div.WY21Hc` / `button.xUc6Hf`
> with a `.HtPsUd` view badge. If that changes, update the selectors in
> `scraper/scrape.mjs` (and `photos.mjs` / `video-views.mjs`).

---

## Project structure

```
playwithai/
├── index.html                 # Google Fonts (Zen Kaku Gothic New) + root
├── src/
│   ├── main.jsx               # React entry
│   ├── App.jsx                # page layout + section order
│   ├── index.css              # Tailwind theme tokens, .card / .btn-round / .marquee
│   ├── lib.js                 # formatters + CATEGORY_META / COUNTRY_META / FAVORITE_CARDS
│   ├── data.json              # ← the only data source the site reads
│   └── components/
│       ├── StatsOverview.jsx  # 4 headline numbers
│       ├── TopPhotos.jsx      # hero: most-viewed photos (+ 9.14M total)
│       ├── MostViewed.jsx     # most-viewed reviews — scrolling marquee
│       ├── TopReacted.jsx     # most-reacted reviews — scrolling marquee
│       ├── OwnerReplies.jsx   # businesses that personally replied
│       ├── MapView.jsx        # Leaflet map, country tabs + region breakdown
│       ├── Categories.jsx     # "My Top Favorites" — 6 category cards
│       └── Marquee.jsx        # reusable auto-scroll (pauses on hover)
└── scraper/
    ├── login.mjs              # open real Chrome for a one-time Google login
    ├── scrape.mjs             # harvest reviews + photos + per-video view counts + store ratings
    ├── parse.mjs              # raw → structured + category
    ├── geocode.mjs            # addresses → lat/lng
    ├── photos.mjs             # re-harvest ONLY the photo grid (npm run scrape:photos)
    ├── video-views.mjs        # re-harvest ONLY video view counts (npm run scrape:videoviews)
    ├── video-frames.mjs       # grab a still thumbnail from each featured video
    ├── build-data.mjs         # assemble src/data.json (+ English translations)
    └── output/               # intermediate JSON, screenshots, the manual CSV
```

> `TopReviews.jsx` and `Illustrations.jsx` are earlier drafts that are no longer
> imported and can be deleted.

---

## `src/data.json` shape

```jsonc
{
  "profile": { "name", "level", "points", "profileUrl" },
  "stats":   { "totalReviews", "ratingsOnly", "totalPhotoViews",
               "photoCount", "points", "level", "lastUpdated", "isMockData" },

  "topPhotos":   [ { "id", "url", "views" } ],                 // 15, by view count
  "mostViewed":  [ { "place", "category", "country", "region",
                     "rating", "views", "img", "url",
                     "en", "zh" } ],                           // 10, bilingual
  "mostReacted": [ { "place", "category", "country",
                     "reactions", "img", "url", "en", "zh" } ],// 5
  "ownerReplies":[ { "place", "category", "country", "region",
                     "img", "url", "en", "zh", "reply" } ],    // 5

  "reviews":     [ { "id", "place", "category", "country", "region",
                     "rating", "date", "blurb", "photoCount",
                     "lat", "lng" } ]                          // all 380, drives map + favorites
}
```

---

## Notable design decisions

- **Photos lead the page.** Photo view counts are the one view metric Google
  exposes on the web, and they total millions — so "Most Viewed Photos" is the hero.
- **Marquees for the hand-entered sections.** Most-viewed / most-reacted reviews
  scroll continuously (pause on hover), keeping the page lively.
- **Bilingual reviews.** Featured reviews show an English translation over the
  original Chinese, since the audience reads English; store names keep Google's
  English name, Chinese only when there's no English.
- **Categories are auto-guessed** from the store name first (the Chinese review
  body pollutes keyword matching), with the review's country as a fallback. A few
  edge cases may still be off and can be corrected by hand.
- **Map pins are city-accurate.** Nominatim couldn't resolve most restaurant names,
  so unresolved pins fall back to the correct city centre with a small offset — the
  footprint is right even where the exact address isn't.

---

*Handcrafted with React + Vite + Tailwind. Data from my Google Maps Local Guide contributions.*
