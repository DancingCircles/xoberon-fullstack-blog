import { renderHook } from '@testing-library/react'
import { useWheelScroll } from '../useWheelScroll'

describe('useWheelScroll', () => {
  it('激活时为元素添加 wheel 事件监听', () => {
    const el = document.createElement('div')
    const addSpy = vi.spyOn(el, 'addEventListener')
    const ref = { current: el }

    renderHook(() => useWheelScroll(ref, true))
    expect(addSpy).toHaveBeenCalledWith('wheel', expect.any(Function), { passive: false })
  })

  it('非激活时不添加监听', () => {
    const el = document.createElement('div')
    const addSpy = vi.spyOn(el, 'addEventListener')
    const ref = { current: el }

    renderHook(() => useWheelScroll(ref, false))
    expect(addSpy).not.toHaveBeenCalled()
  })

  it('卸载时移除监听', () => {
    const el = document.createElement('div')
    const removeSpy = vi.spyOn(el, 'removeEventListener')
    const ref = { current: el }

    const { unmount } = renderHook(() => useWheelScroll(ref, true))
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('wheel', expect.any(Function))
  })
})
