import { renderHook } from '@testing-library/react'
import { useBodyScrollLock } from '../useBodyScrollLock'

vi.mock('../useLenis', () => ({
  useLenis: () => ({ lenis: null }),
}))

describe('useBodyScrollLock', () => {
  afterEach(() => {
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.width = ''
    document.body.style.paddingRight = ''
    document.body.style.overflowY = ''
  })

  it('isOpen=true 时锁定滚动', () => {
    renderHook(() => useBodyScrollLock(true))
    expect(document.body.style.position).toBe('fixed')
    expect(document.body.style.width).toBe('100%')
    expect(document.body.style.overflowY).toBe('scroll')
  })

  it('isOpen=false 时不锁定', () => {
    renderHook(() => useBodyScrollLock(false))
    expect(document.body.style.position).not.toBe('fixed')
  })

  it('卸载时恢复滚动', () => {
    const { unmount } = renderHook(() => useBodyScrollLock(true))
    expect(document.body.style.position).toBe('fixed')
    unmount()
    expect(document.body.style.position).toBe('')
  })
})
