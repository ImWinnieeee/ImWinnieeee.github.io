import { useRef, useEffect, useState } from 'react'

// 側邊手記：在寬螢幕上，當所屬區塊捲入視窗時，便利貼會從主區塊往左/右邊界
// 「拉」出並淡入；窄螢幕則內嵌顯示在區塊下方，文字永遠看得到。
export default function SideNote({ side = 'right', accent = 'var(--color-vermilion)', children }) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          io.unobserve(el) // 只觸發一次
        }
      },
      { threshold: 0.35, rootMargin: '0px 0px -10% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <aside
      ref={ref}
      className={`sidenote sidenote--${side} ${inView ? 'is-in' : ''}`}
      style={{ '--note-accent': accent }}
    >
      <span className="sidenote__pin" aria-hidden="true" />
      <p className="sidenote__text">{children}</p>
    </aside>
  )
}
