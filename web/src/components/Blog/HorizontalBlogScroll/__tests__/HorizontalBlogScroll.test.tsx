import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../test/test-utils'
import HorizontalBlogScroll from '../HorizontalBlogScroll'

import '../../../../test/mocks/gsap'
import '../../../../test/mocks/lenis'

vi.mock('../../../../services/mockRuntime', () => ({
  fetchRecommendations: vi.fn(() => Promise.resolve([])),
}))

vi.mock('../BlogModal', () => ({
  default: () => <div data-testid="blog-modal" />,
}))

vi.mock('../BlogCard', () => ({
  default: ({ post }: { post: { title: string } }) => <div data-testid="blog-card">{post.title}</div>,
}))

describe('HorizontalBlogScroll', () => {
  it('应该正常渲染', async () => {
    const { container } = renderWithProviders(<HorizontalBlogScroll />)
    await waitFor(() =>
      expect(container.querySelector('.horizontal-scroll-section')).toBeInTheDocument()
    )
  })

  it('无文章时不渲染卡片', async () => {
    renderWithProviders(<HorizontalBlogScroll />, { data: { posts: [] } })
    await waitFor(() =>
      expect(screen.queryAllByTestId('blog-card')).toHaveLength(0)
    )
  })
})
