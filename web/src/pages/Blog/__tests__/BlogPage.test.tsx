import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../test/test-utils'
import BlogPage from '../BlogPage'

import '../../../test/mocks/gsap'
import '../../../test/mocks/lenis'

vi.mock('../../../components/Blog/TypographicHero', () => ({
  default: () => <div data-testid="typographic-hero">BLOG HERO</div>,
}))

vi.mock('../../../components/Blog/HorizontalBlogScroll', () => ({
  default: () => <div data-testid="horizontal-scroll">SCROLL</div>,
}))

vi.mock('../../../components/Blog/BlogList', () => ({
  default: () => <div data-testid="blog-list">BLOG LIST</div>,
}))

vi.mock('../../../components/Blog/WritePostModal', () => ({
  default: () => <div data-testid="write-modal" />,
}))

describe('BlogPage', () => {
  it('应该正常渲染', () => {
    renderWithProviders(<BlogPage />)
    expect(screen.getByTestId('typographic-hero')).toBeInTheDocument()
  })

  it('应该展示博客列表区域', () => {
    renderWithProviders(<BlogPage />)
    expect(screen.getByTestId('horizontal-scroll')).toBeInTheDocument()
    expect(screen.getByTestId('blog-list')).toBeInTheDocument()
  })

  it('应该展示滚动按钮', () => {
    renderWithProviders(<BlogPage />)
    expect(screen.getByRole('button', { name: /scroll to content/i })).toBeInTheDocument()
  })
})
