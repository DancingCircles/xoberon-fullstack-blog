import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { useLenis } from './useLenis'

interface DragState {
  isDragging: boolean
  startX: number
  startY: number
  currentX: number
  dragStartX: number
  hasDragged: boolean
  velocity: number
  lastClientX: number
  lastTime: number
  directionLocked: 'horizontal' | 'vertical' | null
}

interface UseDragScrollOptions {
  /** 当前行数据长度数组，每项代表该行的元素数量 */
  rowLengths: number[]
  /**
   * 根据视口宽度返回可见卡片数量（用于吸附计算）。
   * 不传则默认按 600/768 断点响应式计算。
   */
  getVisibleCards?: (viewportWidth: number) => number
}

const DEFAULT_VISIBLE_CARDS = (vpWidth: number) => {
  if (vpWidth <= 600) return 1
  if (vpWidth <= 768) return 2
  return 3
}

export function useDragScroll({ rowLengths, getVisibleCards = DEFAULT_VISIBLE_CARDS }: UseDragScrollOptions) {
  const rowViewportRefs = useRef<(HTMLDivElement | null)[]>([])
  const rowTrackRefs = useRef<(HTMLDivElement | null)[]>([])
  const rowDragStates = useRef<DragState[]>([])
  const { lenis } = useLenis()

  const getRowDrag = (i: number) => {
    if (!rowDragStates.current[i]) {
      rowDragStates.current[i] = {
        isDragging: false, startX: 0, startY: 0, currentX: 0, dragStartX: 0,
        hasDragged: false, velocity: 0, lastClientX: 0, lastTime: 0,
        directionLocked: null,
      }
    }
    return rowDragStates.current[i]
  }

  useEffect(() => {
    let activeRow = -1
    const perRowCleanups: (() => void)[] = []

    rowLengths.forEach((_, i) => {
      const track = rowTrackRefs.current[i]
      if (track) {
        gsap.set(track, { x: 0 })
        getRowDrag(i).currentX = 0
      }
    })

    const clampX = (rowIdx: number, x: number) => {
      const vp = rowViewportRefs.current[rowIdx]
      const track = rowTrackRefs.current[rowIdx]
      if (!vp || !track) return x
      const minX = Math.min(0, -(track.scrollWidth - vp.clientWidth))
      return Math.max(minX, Math.min(0, x))
    }

    const handleStart = (rowIdx: number, clientX: number, clientY?: number) => {
      activeRow = rowIdx
      const drag = getRowDrag(rowIdx)
      const track = rowTrackRefs.current[rowIdx]
      drag.isDragging = true
      drag.startX = clientX
      drag.startY = clientY ?? 0
      drag.dragStartX = drag.currentX
      drag.hasDragged = false
      drag.velocity = 0
      drag.lastClientX = clientX
      drag.lastTime = Date.now()
      drag.directionLocked = null
      if (track) gsap.killTweensOf(track)
      const vp = rowViewportRefs.current[rowIdx]
      if (vp) vp.style.cursor = 'grabbing'
    }

    const handleMove = (clientX: number, clientY?: number) => {
      if (activeRow < 0) return
      const drag = getRowDrag(activeRow)
      if (!drag.isDragging) return

      if (drag.directionLocked === null && clientY !== undefined) {
        const dx = Math.abs(clientX - drag.startX)
        const dy = Math.abs(clientY - drag.startY)
        if (dx > 8 || dy > 8) {
          if (dx > dy) {
            drag.directionLocked = 'horizontal'
            if (lenis) lenis.stop()
          } else {
            drag.directionLocked = 'vertical'
            drag.isDragging = false
            const vp = rowViewportRefs.current[activeRow]
            if (vp) vp.style.cursor = 'grab'
            activeRow = -1
            return
          }
        } else {
          return
        }
      }

      const deltaX = clientX - drag.startX
      if (Math.abs(deltaX) > 5) drag.hasDragged = true

      const now = Date.now()
      const dt = now - drag.lastTime
      if (dt > 0) drag.velocity = (clientX - drag.lastClientX) / dt
      drag.lastClientX = clientX
      drag.lastTime = now

      const track = rowTrackRefs.current[activeRow]
      if (track) {
        const newX = clampX(activeRow, drag.dragStartX + deltaX)
        gsap.set(track, { x: newX })
        drag.currentX = newX
      }
    }

    const handleEnd = () => {
      if (activeRow < 0) return
      const drag = getRowDrag(activeRow)
      drag.isDragging = false
      if (lenis) lenis.start()
      const vp = rowViewportRefs.current[activeRow]
      if (vp) vp.style.cursor = 'grab'

      const track = rowTrackRefs.current[activeRow]
      if (track && vp) {
        const firstCard = track.children[0] as HTMLElement | undefined
        if (!firstCard) { activeRow = -1; return }
        const gap = parseFloat(getComputedStyle(track).gap) || 0
        const step = firstCard.offsetWidth + gap

        const momentum = drag.velocity * 500
        const rawTarget = drag.currentX + momentum
        const visibleCards = getVisibleCards(vp.clientWidth)

        const snappedIndex = Math.round(-rawTarget / step)
        const maxIndex = rowLengths[activeRow] - visibleCards
        const clampedIndex = Math.max(0, Math.min(snappedIndex, Math.max(0, maxIndex)))
        const snapX = -(clampedIndex * step)

        gsap.to(track, {
          x: snapX,
          duration: 0.5,
          ease: 'power3.out',
          onUpdate: () => {
            drag.currentX = gsap.getProperty(track, 'x') as number
          },
        })
      }
      activeRow = -1
    }

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX)
    const onMouseUp = () => handleEnd()
    const onTouchMoveGlobal = (e: TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY)
    const onTouchEndGlobal = () => handleEnd()

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('touchmove', onTouchMoveGlobal, { passive: true })
    window.addEventListener('touchend', onTouchEndGlobal)

    rowLengths.forEach((_, rowIdx) => {
      const vp = rowViewportRefs.current[rowIdx]
      if (!vp) return
      vp.style.cursor = 'grab'

      const onMouseDown = (e: MouseEvent) => {
        if (e.button !== 0) return
        e.preventDefault()
        handleStart(rowIdx, e.clientX)
      }
      const onTouchStart = (e: TouchEvent) => {
        handleStart(rowIdx, e.touches[0].clientX, e.touches[0].clientY)
      }

      vp.addEventListener('mousedown', onMouseDown)
      vp.addEventListener('touchstart', onTouchStart, { passive: true })
      perRowCleanups.push(() => {
        vp.removeEventListener('mousedown', onMouseDown)
        vp.removeEventListener('touchstart', onTouchStart)
      })
    })

    return () => {
      // Ensure Lenis is resumed if component unmounts mid-drag
      if (activeRow >= 0 && lenis) lenis.start()
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('touchmove', onTouchMoveGlobal)
      window.removeEventListener('touchend', onTouchEndGlobal)
      perRowCleanups.forEach((fn) => fn())
    }
  }, [rowLengths, getVisibleCards, lenis])

  return { rowViewportRefs, rowTrackRefs, hasDragged: (i: number) => getRowDrag(i).hasDragged }
}
