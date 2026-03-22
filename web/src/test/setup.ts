import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// 在任何组件/依赖被导入前就注册全局 mock，避免真实动画/3D/滚动逻辑在测试中常驻导致进程无法退出
import './mocks/gsap'
import './mocks/lenis'
import './mocks/three'
import './mocks/lottie'
import './mocks/react-markdown'

// jsdom 默认不提供 localStorage，手动实现一个内存版本
function createMockStorage(): Storage {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value) },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
    get length() { return Object.keys(store).length },
    key: (index: number) => Object.keys(store)[index] ?? null,
  }
}

Object.defineProperty(window, 'localStorage', { value: createMockStorage(), writable: true })
Object.defineProperty(window, 'sessionStorage', { value: createMockStorage(), writable: true })

afterEach(() => {
  cleanup()
  localStorage.clear()
  sessionStorage.clear()
  vi.clearAllMocks()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

// jsdom 不支持 matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// jsdom 不支持 IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
})

// jsdom 不支持 ResizeObserver
class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
})

// jsdom scrollTo 是 noop
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo

// Suppress GSAP ScrollTrigger warnings that flood stderr and OOM the worker
const _origWarn = console.warn
console.warn = (...args: unknown[]) => {
  const msg = String(args[0] ?? '')
  if (msg.includes('Invalid property') || msg.includes('Missing plugin')) return
  _origWarn(...args)
}

// jsdom 不支持 SVGElement.getTotalLength
if (typeof SVGElement !== 'undefined') {
  SVGElement.prototype.getTotalLength = () => 0
}
