import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import type Lenis from 'lenis'
import { LenisContext } from '../../../../contexts/lenis/LenisContext'
import { render, renderWithProviders, screen, userEvent, waitFor } from '../../../../test/test-utils'
import ScrollToTop from '../ScrollToTop'

import '../../../../test/mocks/gsap'
import '../../../../test/mocks/lenis'

vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: {
    getAll: vi.fn(() => []),
    clearScrollMemory: vi.fn(),
    refresh: vi.fn(),
    update: vi.fn(),
  },
}))

function RouteChangeHarness() {
  return (
    <>
      <ScrollToTop />
      <Link to="/home">Go home</Link>
      <Routes>
        <Route path="/notes" element={<div>Notes</div>} />
        <Route path="/home" element={<div>Home</div>} />
      </Routes>
    </>
  )
}

describe('ScrollToTop', () => {
  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      callback(0)
      return 0
    })
  })

  afterEach(() => {
    document.body.innerHTML = ''
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.left = ''
    document.body.style.right = ''
    document.body.style.width = ''
    document.body.style.paddingRight = ''
    document.body.style.overflowY = ''
    document.body.style.overscrollBehavior = ''
  })

  it('renders nothing', () => {
    const { container } = renderWithProviders(<ScrollToTop />)

    expect(container.innerHTML).toBe('')
  })

  it('clears stale body scroll lock after route changes', async () => {
    document.body.style.position = 'fixed'
    document.body.style.top = '-240px'
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.style.width = '100%'
    document.body.style.paddingRight = '15px'
    document.body.style.overflowY = 'scroll'
    document.body.style.overscrollBehavior = 'none'

    renderWithProviders(<RouteChangeHarness />, {
      routerProps: { initialEntries: ['/notes'] },
    })

    await userEvent.click(screen.getByText('Go home'))

    await waitFor(() => {
      expect(screen.getByText('Home')).toBeInTheDocument()
      expect(document.body.style.position).toBe('')
      expect(document.body.style.top).toBe('')
      expect(document.body.style.overflowY).toBe('')
    })
  })

  it('keeps body lock when a modal is still open', async () => {
    document.body.style.position = 'fixed'
    document.body.insertAdjacentHTML('beforeend', '<div role="dialog" aria-modal="true"></div>')

    renderWithProviders(<RouteChangeHarness />, {
      routerProps: { initialEntries: ['/notes'] },
    })

    await userEvent.click(screen.getByText('Go home'))

    await waitFor(() => {
      expect(screen.getByText('Home')).toBeInTheDocument()
      expect(document.body.style.position).toBe('fixed')
    })
  })

  it('resizes Lenis after route changes so wheel limits match the new page', async () => {
    const lenis = {
      start: vi.fn(),
      resize: vi.fn(),
      scrollTo: vi.fn(),
    } as unknown as Lenis

    render(
      <LenisContext.Provider value={{ lenis }}>
        <MemoryRouter initialEntries={['/notes']}>
          <RouteChangeHarness />
        </MemoryRouter>
      </LenisContext.Provider>,
    )

    await userEvent.click(screen.getByText('Go home'))

    await waitFor(() => {
      expect(screen.getByText('Home')).toBeInTheDocument()
      expect(lenis.resize).toHaveBeenCalled()
    })
  })
})
