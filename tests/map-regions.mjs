import assert from 'node:assert/strict'
import fs from 'node:fs'
import { chromium } from 'playwright'
import { COUNTRY_META } from '../src/lib.js'

// Exercise every current region without bulk downloading public map tiles.
const { reviews } = JSON.parse(fs.readFileSync(new URL('../src/data.json', import.meta.url)))
const points = reviews.filter(r => r.lat && r.lng)
for (const r of points) {
  assert(Number.isFinite(r.lat) && Math.abs(r.lat) <= 85.051129, r.place)
  assert(Number.isFinite(r.lng) && Math.abs(r.lng) <= 180, r.place)
}
const browser = await chromium.launch({ headless: true })
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route('https://tile.openstreetmap.org/**', route => route.fulfill({
      contentType: 'image/png',
      body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZkAAAAASUVORK5CYII=', 'base64'),
    }))
    await page.goto(process.env.MAP_TEST_URL || 'http://127.0.0.1:5174/')
    const card = page.locator('.card').filter({ has: page.getByRole('heading', { name: "🗺️ Where I've Eaten Around the World" }) })
    let checks = 0
    const check = async (label, count) => {
      await page.waitForTimeout(350)
      assert.equal(await card.locator('.leaflet-overlay-pane path').count(), count, label)
      await page.waitForFunction(() => {
        const tiles = [...document.querySelectorAll('.leaflet-tile-container img')]
        return tiles.length && tiles.every(i => i.complete && i.naturalWidth > 0)
      })
      const urls = await card.locator('.leaflet-tile').evaluateAll(imgs => imgs.map(i => i.src))
      for (const url of urls) {
        const match = url.match(/^https:\/\/tile\.openstreetmap\.org\/(\d+)\/(\d+)\/(\d+)\.png$/)
        assert(match, url)
        const [z, x, y] = match.slice(1).map(Number)
        assert(z >= 2 && z <= 19 && x < 2 ** z && y < 2 ** z, url)
      }
      checks++
      console.log(`${viewport.width}px ${label}: ${count} pins, valid tiles`)
    }
    for (const [country, entries] of Object.entries(Object.groupBy(points, r => r.country))) {
      const meta = COUNTRY_META[country]
      await card.getByRole('button', { name: `${meta.flag} ${meta.label} ${entries.length}`, exact: true }).click()
      await check(country, entries.length)
      for (const [region, group] of Object.entries(Object.groupBy(entries, r => r.region || '—'))) {
        await card.getByRole('button', { name: `${region} · ${group.length}`, exact: true }).click()
        await check(`${country}/${region}`, group.length)
      }
      await card.getByRole('button', { name: 'show all cities', exact: true }).click()
      await check(`${country}/reset`, entries.length)
    }
    assert.deepEqual(errors, [])
    console.log(`PASS ${viewport.width}px: ${checks} views`)
    await page.close()
  }
} finally {
  await browser.close()
}
