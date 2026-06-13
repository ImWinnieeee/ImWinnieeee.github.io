// Shared helpers: number formatting, category & country metadata

// For an English audience use K / M
export function formatViews(n) {
  if (n == null) return '—'
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K'
  return n.toLocaleString('en-US')
}

export function formatInt(n) {
  if (n == null) return '—'
  return n.toLocaleString('en-US')
}

// Categories used to colour the map (Japanese-palette, no yellow)
export const CATEGORY_META = {
  Japanese: { color: '#cf4f3e', emoji: '🍣' },                  // 朱 vermilion
  Italian: { color: '#8a9a5b', emoji: '🍝' },                   // 抹茶 matcha
  'Taiwanese & Chinese': { color: '#3c5a72', emoji: '🍜' },     // 藍 indigo
  Dessert: { color: '#d98c9d', emoji: '🍰' },                   // 桜 sakura
  Drinks: { color: '#a9743f', emoji: '🧋' },                    // 焦茶 tea brown
  Attraction: { color: '#3f8f86', emoji: '⛩️' },               // 青緑 teal
  'Southeast Asian': { color: '#8a6fae', emoji: '🍛' },         // 藤 wisteria
  Other: { color: '#9b8e7e', emoji: '📍' },                     // 利休 neutral
}

// "My Top Favorites" cards (6). "Other" groups the non-food / regional buckets.
export const FAVORITE_CARDS = [
  { label: 'Taiwanese & Chinese', cats: ['Taiwanese & Chinese'], color: '#3c5a72', emoji: '🍜' },
  { label: 'Japanese', cats: ['Japanese'], color: '#cf4f3e', emoji: '🍣' },
  { label: 'Italian', cats: ['Italian'], color: '#8a9a5b', emoji: '🍝' },
  { label: 'Dessert', cats: ['Dessert'], color: '#d98c9d', emoji: '🍰' },
  { label: 'Drinks', cats: ['Drinks'], color: '#a9743f', emoji: '🧋' },
  { label: 'Other', cats: ['Attraction', 'Southeast Asian', 'Other'], color: '#3f8f86', emoji: '✨' },
]

// Countries shown on the map
export const COUNTRY_META = {
  Taiwan: { flag: '🇹🇼', label: 'Taiwan' },
  Japan: { flag: '🇯🇵', label: 'Japan' },
  Italy: { flag: '🇮🇹', label: 'Italy' },
  Thailand: { flag: '🇹🇭', label: 'Thailand' },
  Vatican: { flag: '🇻🇦', label: 'Vatican' },
}
