import { renderWithProviders } from '../../../../test/test-utils'
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

describe('ScrollToTop', () => {
  it('应该正常渲染（返回 null）', () => {
    const { container } = renderWithProviders(<ScrollToTop />)
    expect(container.innerHTML).toBe('')
  })
})
