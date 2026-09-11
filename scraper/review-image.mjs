import fs from 'node:fs'

const picks = JSON.parse(fs.readFileSync(new URL('./review-image-picks.json', import.meta.url), 'utf8'))

export function reviewImagePosition(review) {
  return picks[review?.id]?.position || '50% 50%'
}

// The contribution scrape includes a small business avatar before review media.
// Only accept full-size media thumbnails from the review; never use that avatar.
export function reviewImage(review) {
  // Saved selections were visually checked against this exact review's media.
  if (picks[review?.id]) return picks[review.id].url
  const image = (review?.images || []).find((url) =>
    /^https:\/\/lh\d+\.googleusercontent\.com\//.test(url)
    && /=w\d{3,}-h\d{3,}-p-k-no$/.test(url)
    && !url.includes('-rp-')
  ) || null
  // Remove Google's landscape crop before applying the card's square crop.
  return image ? image.split('=')[0] + '=w600' : null
}
