import { vi } from 'vitest'

const timelineMock = {
  to: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  fromTo: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  kill: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  progress: vi.fn().mockReturnThis(),
  reversed: vi.fn().mockReturnThis(),
}

const gsapMock = {
  to: vi.fn().mockReturnValue({ kill: vi.fn() }),
  from: vi.fn().mockReturnValue({ kill: vi.fn() }),
  fromTo: vi.fn().mockReturnValue({ kill: vi.fn() }),
  set: vi.fn(),
  timeline: vi.fn((opts?: Record<string, unknown>) => {
    if (opts?.onComplete && typeof opts.onComplete === 'function') {
      queueMicrotask(opts.onComplete as () => void)
    }
    return { ...timelineMock }
  }),
  context: vi.fn((_fn?: unknown) => ({ revert: vi.fn(), add: vi.fn(), kill: vi.fn() })),
  killTweensOf: vi.fn(),
  getProperty: vi.fn(() => 0),
  registerPlugin: vi.fn(),
  ticker: {
    add: vi.fn(),
    remove: vi.fn(),
    lagSmoothing: vi.fn(),
  },
}

const ScrollTriggerMock = {
  create: vi.fn(),
  update: vi.fn(),
  refresh: vi.fn(),
  sort: vi.fn(),
  getAll: vi.fn(() => []),
  killAll: vi.fn(),
}

vi.mock('gsap', () => ({
  default: gsapMock,
  gsap: gsapMock,
}))

vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: ScrollTriggerMock,
}))

export { gsapMock, ScrollTriggerMock }
