import { vi } from 'vitest'

const lenisMock = {
  on: vi.fn(),
  off: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  destroy: vi.fn(),
  raf: vi.fn(),
  scrollTo: vi.fn(),
}

vi.mock('lenis', () => ({
  default: vi.fn(() => lenisMock),
}))

export { lenisMock }
