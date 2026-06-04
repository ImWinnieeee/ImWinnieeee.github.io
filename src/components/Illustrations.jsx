// 手繪感食物線稿插畫（純 SVG，stroke 用 currentColor，可用 text 顏色控制）
// 刻意讓線條略帶歪斜，營造手繪筆觸

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function RamenIcon({ size = 48, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} {...base}>
      <path d="M9 30 Q11 47 32 49 Q53 47 55 30" />
      <path d="M7 29 Q32 21 57 29" />
      <path d="M22 17 q3 -6 0 -10 M32 16 q3 -6 0 -11 M42 17 q3 -6 0 -10" />
      <path d="M39 12 l16 -5 M40 16 l15 -3" />
    </svg>
  )
}

export function SushiIcon({ size = 48, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} {...base}>
      <ellipse cx="32" cy="41" rx="22" ry="8.5" />
      <path d="M11 37 Q32 25 53 37" />
      <path d="M27 28 q5 -2 10 0 l0 19 q-5 2 -10 0 z" />
    </svg>
  )
}

export function CoffeeIcon({ size = 48, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} {...base}>
      <path d="M15 27 H43 V37 Q43 49 29 49 Q15 49 15 37 Z" />
      <path d="M43 30 Q53 30 53 37 Q53 44 43 44" />
      <path d="M23 18 q3 -5 0 -9 M31 18 q3 -5 0 -9" />
      <path d="M14 53 H44" />
    </svg>
  )
}

export function CakeIcon({ size = 48, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} {...base}>
      <path d="M14 45 L32 21 L50 45 Z" />
      <path d="M16 39 Q32 31 48 39" />
      <circle cx="32" cy="20" r="2.6" />
      <path d="M32 17 q3 -5 7 -4" />
    </svg>
  )
}

export function LeafIcon({ size = 48, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} {...base}>
      <path d="M32 53 C32 31 41 17 53 13 C45 29 41 41 32 53 Z" />
      <path d="M32 53 C32 35 27 24 17 19" />
    </svg>
  )
}

export function ChopsticksIcon({ size = 48, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} {...base}>
      <path d="M12 50 L52 14" />
      <path d="M18 52 L54 22" />
    </svg>
  )
}

// 手繪毛筆分隔線
export function BrushDivider({ className = '' }) {
  return (
    <svg viewBox="0 0 220 12" className={className} fill="none" preserveAspectRatio="none">
      <path
        d="M4 7 Q40 2 70 6 Q120 11 150 5 Q190 1 216 6"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}

// 依類別名稱取得對應插畫
export function CategoryIllustration({ category, ...props }) {
  if (category === '日式') return <RamenIcon {...props} />
  if (category === '義式') return <LeafIcon {...props} />
  if (category === '甜點飲料') return <CakeIcon {...props} />
  return <SushiIcon {...props} />
}
