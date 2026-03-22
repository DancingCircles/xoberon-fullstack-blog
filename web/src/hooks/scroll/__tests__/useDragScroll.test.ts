import { renderHook } from '@testing-library/react'
import { useDragScroll } from '../useDragScroll'

import '../../../test/mocks/gsap'
import '../../../test/mocks/lenis'

describe('useDragScroll', () => {
  it('应该返回必要的 ref 和状态', () => {
    const { result } = renderHook(() => useDragScroll({ rowLengths: [3, 3] }))
    expect(result.current.rowViewportRefs).toBeDefined()
    expect(result.current.rowTrackRefs).toBeDefined()
    expect(result.current.hasDragged).toBeDefined()
    expect(typeof result.current.hasDragged).toBe('function')
  })

  it('hasDragged 初始返回 false', () => {
    const { result } = renderHook(() => useDragScroll({ rowLengths: [3] }))
    expect(result.current.hasDragged(0)).toBe(false)
  })
})
