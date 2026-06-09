import { useEffect, useState } from 'react'

// 回到頂端：往下滑超過一段距離後，右下角浮出一顆圓鈕，點了平滑捲回最上面。
// 在頂端時自動淡出隱藏，不擋畫面。
export default function BackToTop() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400)
    onScroll() // 進站時先判斷一次目前位置
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      type="button"
      aria-label="Back to top"
      title="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`fixed z-[70] bottom-5 right-5 h-12 w-12 grid place-items-center rounded-full
        bg-[var(--color-vermilion)] text-white text-xl leading-none shadow-lg
        border border-[var(--color-vermilion)] transition-all duration-300
        hover:-translate-y-0.5 hover:shadow-xl
        ${show ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-3 pointer-events-none'}`}
    >
      ↑
    </button>
  )
}
