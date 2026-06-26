import { act, render, screen, waitFor } from '@testing-library/react'
import { useContext } from 'react'
import Lenis from 'lenis'
import { LenisProvider } from '../LenisProvider'
import { LenisContext } from '../LenisContext'
import { lenisMock } from '../../../test/mocks/lenis'

type MediaListener = (event: MediaQueryListEvent) => void

function mockMatchMedia(matches: boolean) {
  let currentMatches = matches
  let currentMedia = ''
  const listeners = new Set<MediaListener>()

  const mediaQuery = {
    get matches() {
      return currentMatches
    },
    get media() {
      return currentMedia
    },
    onchange: null,
    addListener: vi.fn((listener: MediaListener) => {
      listeners.add(listener)
    }),
    removeListener: vi.fn((listener: MediaListener) => {
      listeners.delete(listener)
    }),
    addEventListener: vi.fn((_event: string, listener: EventListenerOrEventListenerObject) => {
      if (typeof listener === 'function') {
        listeners.add(listener as MediaListener)
      }
    }),
    removeEventListener: vi.fn((_event: string, listener: EventListenerOrEventListenerObject) => {
      if (typeof listener === 'function') {
        listeners.delete(listener as MediaListener)
      }
    }),
    dispatchEvent: vi.fn(),
  } as MediaQueryList

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => {
      currentMedia = query
      return mediaQuery
    }),
  })

  return {
    setMatches(nextMatches: boolean) {
      currentMatches = nextMatches
      const event = { matches: nextMatches, media: currentMedia } as MediaQueryListEvent
      listeners.forEach(listener => listener(event))
    },
  }
}

function LenisStateProbe() {
  const context = useContext(LenisContext)
  return <span data-testid="lenis-state">{context?.lenis ? 'enabled' : 'disabled'}</span>
}

describe('LenisProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates Lenis on desktop-class viewports', async () => {
    mockMatchMedia(false)
    const LenisConstructor = vi.mocked(Lenis)

    render(
      <LenisProvider>
        <LenisStateProbe />
      </LenisProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('lenis-state')).toHaveTextContent('enabled')
    })

    expect(LenisConstructor).toHaveBeenCalledTimes(1)
  })

  it('uses native scrolling on mobile-class viewports', () => {
    mockMatchMedia(true)
    const LenisConstructor = vi.mocked(Lenis)

    render(
      <LenisProvider>
        <LenisStateProbe />
      </LenisProvider>,
    )

    expect(screen.getByTestId('lenis-state')).toHaveTextContent('disabled')
    expect(LenisConstructor).not.toHaveBeenCalled()
  })

  it('destroys Lenis when the viewport switches to native mobile scrolling', async () => {
    const mediaQuery = mockMatchMedia(false)

    render(
      <LenisProvider>
        <LenisStateProbe />
      </LenisProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('lenis-state')).toHaveTextContent('enabled')
    })

    act(() => {
      mediaQuery.setMatches(true)
    })

    await waitFor(() => {
      expect(screen.getByTestId('lenis-state')).toHaveTextContent('disabled')
    })

    expect(lenisMock.destroy).toHaveBeenCalledTimes(1)
  })
})
