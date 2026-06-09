import { useRef, useEffect } from 'react'

// 橫向跑馬燈：
//  • 預設「慢慢」往單一方向飄（autoSpeed，比以前慢），內容複製一份首尾相接、無縫循環。
//  • 手機可直接用手指左右滑動方塊（原生捲動）；按住時會停下來，放開幾秒後再自己慢慢飄。
//  • 桌機滑鼠移到卡片上會暫停（方便閱讀／點擊）。
//  • 按住 ‹ / › ：往該方向「快速、連續」滾動（長按就一直滾，頭尾相接無縫），放開恢復慢飄。
//    桌機、手機都一樣，不再是「跳一格就停」的頓挫感。
const FAST = 8 // 按住箭頭時的快速滾動速度（px / frame）

export default function Marquee({ items, renderItem, autoSpeed = 0.25 }) {
  const scrollRef = useRef(null)
  const dir = useRef(1)        // 目前慢飄方向：+1 向右、-1 向左（預設向右）
  const fast = useRef(0)       // 按住箭頭時的快速滾動方向（0 = 沒按）
  const paused = useRef(false) // 滑鼠停在卡片上 / 手指按著卡片 → 先停下
  const resumeT = useRef(null) // 放開手指後，過幾秒恢復慢飄的計時器

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    let raf
    // 關鍵：自動捲動採「相對位移」而非「絕對定位」。
    //  • 用 acc 累積零點幾像素的速度，湊滿 1 整數像素才動一次（scrollLeft 是整數，
    //    直接 `+= 0.25` 會被一直捨成 0、永遠不動 —— 這是之前「跑馬燈不動」的原因）。
    //  • 移動時是 `el.scrollLeft += whole`，疊加在「目前實際位置」上（含手指剛滑到的地方），
    //    永遠不會把使用者滑到的位置硬拉回去 —— 這是手機能順順左右滑的關鍵。
    //  • 手指按著／滑鼠停在卡片上時 acc 歸零、完全不寫，整個交給原生捲動。
    let acc = 0
    const tick = () => {
      const half = el.scrollWidth / 2
      if (half > 0) {
        if (fast.current !== 0) acc += fast.current * FAST       // 按住箭頭：快速滾
        else if (!paused.current) acc += dir.current * autoSpeed // 預設：慢慢飄
        else acc = 0                                             // 暫停／手指在滑：完全放手
        const whole = Math.trunc(acc)
        if (whole !== 0) {
          acc -= whole
          let next = el.scrollLeft + whole
          // 內容是兩份複製，跨過半寬就回捲一個半寬 —— 視覺上完全無縫
          if (next >= half) next -= half
          else if (next < 0) next += half
          el.scrollLeft = next
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [autoSpeed])

  // 按住箭頭：往該方向快速滾動（並把慢飄方向也設成這邊，放開後就接著往這方向慢飄）
  const startFast = (d) => { dir.current = d; fast.current = d; clearTimeout(resumeT.current); paused.current = false }
  const stopFast = () => { fast.current = 0 }

  const Arrow = ({ side }) => {
    const d = side === 'left' ? -1 : 1
    return (
      <button
        type="button"
        aria-label={side === 'left' ? 'Scroll left' : 'Scroll right'}
        onPointerDown={(e) => { e.preventDefault(); startFast(d); try { e.currentTarget.setPointerCapture(e.pointerId) } catch {} }}
        onPointerUp={stopFast}
        onPointerLeave={stopFast}
        onPointerCancel={stopFast}
        onLostPointerCapture={stopFast}
        className={`absolute top-1/2 -translate-y-1/2 z-10 ${side === 'left' ? 'left-1' : 'right-1'}
          h-9 w-9 grid place-items-center rounded-full bg-[var(--color-card)] text-[var(--color-ink)] select-none touch-none
          border border-[var(--color-line)] shadow-md transition hover:text-[var(--color-vermilion)] hover:border-[var(--color-vermilion)]`}
      >
        {side === 'left' ? '‹' : '›'}
      </button>
    )
  }

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="marquee"
        // 桌機：滑鼠移入卡片區暫停、移出恢復（只認滑鼠，避免觸控誤觸後卡住）
        onPointerEnter={(e) => { if (e.pointerType === 'mouse') paused.current = true }}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse') paused.current = false }}
        // 手機：手指按著就停（可邊看邊滑），放開 3 秒後再自己慢慢飄回去
        onTouchStart={() => { clearTimeout(resumeT.current); paused.current = true }}
        onTouchEnd={() => { resumeT.current = setTimeout(() => { paused.current = false }, 3000) }}
      >
        <div className="flex gap-4 w-max">
          {items.map((it, i) => <div key={`a-${i}`} className="shrink-0">{renderItem(it, i)}</div>)}
          {items.map((it, i) => <div key={`b-${i}`} className="shrink-0" aria-hidden="true">{renderItem(it, i)}</div>)}
        </div>
      </div>
      <Arrow side="left" />
      <Arrow side="right" />
    </div>
  )
}
