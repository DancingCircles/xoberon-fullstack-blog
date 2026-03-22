import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../test/test-utils'
import BlogList from '../BlogList'

import '../../../../test/mocks/gsap'

vi.mock('../../BlogModal', () => ({
  default: () => <div data-testid="blog-modal" />,
}))

describe('BlogList', () => {
  it('posts 为空时展示空状态', () => {
    renderWithProviders(<BlogList />, { data: { posts: [] } })
    expect(screen.getByText('No articles found')).toBeInTheDocument()
  })

  it('应该渲染分类过滤器', () => {
    renderWithProviders(<BlogList />, { data: { posts: [] } })
    expect(screen.getByText('Latest')).toBeInTheDocument()
  })
})
