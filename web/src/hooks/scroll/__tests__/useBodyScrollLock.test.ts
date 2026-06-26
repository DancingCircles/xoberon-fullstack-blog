import { renderHook } from '@testing-library/react'
import { useBodyScrollLock } from '../useBodyScrollLock'

vi.mock('../useLenis', () => ({
  useLenis: () => ({ lenis: null }),
}))

describe('useBodyScrollLock', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 240,
    })
    window.history.pushState(null, '', '/notes')
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      callback(0)
      return 0
    })
  })

  afterEach(() => {
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.left = ''
    document.body.style.right = ''
    document.body.style.width = ''
    document.body.style.paddingRight = ''
    document.body.style.overflowY = ''
    document.body.style.overscrollBehavior = ''
    window.history.pushState(null, '', '/')
  })

  it('locks body scroll when open', () => {
    renderHook(() => useBodyScrollLock(true))

    expect(document.body.style.position).toBe('fixed')
    expect(document.body.style.top).toBe('-240px')
    expect(document.body.style.width).toBe('100%')
    expect(document.body.style.overflowY).toBe('scroll')
  })

  it('does not lock body scroll when closed', () => {
    renderHook(() => useBodyScrollLock(false))

    expect(document.body.style.position).not.toBe('fixed')
  })

  it('restores scroll when closing on the same route', () => {
    const { unmount } = renderHook(() => useBodyScrollLock(true))

    expect(document.body.style.position).toBe('fixed')
    unmount()

    expect(document.body.style.position).toBe('')
    expect(window.scrollTo).toHaveBeenCalledWith(0, 240)
  })

  it('does not restore the previous page scroll after route changes', () => {
    const { unmount } = renderHook(() => useBodyScrollLock(true))

    window.history.pushState(null, '', '/home')
    unmount()

    expect(document.body.style.position).toBe('')
    expect(window.scrollTo).not.toHaveBeenCalledWith(0, 240)
  })
})
