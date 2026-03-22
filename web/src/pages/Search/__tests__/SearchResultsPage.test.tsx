import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../test/test-utils'
import SearchResultsPage from '../SearchResultsPage'

import '../../../test/mocks/gsap'

vi.mock('../../../services/mockRuntime', () => ({
  fetchPosts: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
  fetchEssays: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
  searchUsers: vi.fn(() => Promise.resolve([])),
}))

vi.mock('../../../components/Blog/BlogModal', () => ({
  default: () => <div data-testid="blog-modal" />,
}))

vi.mock('../../../components/Common/EssayModal', () => ({
  default: () => <div data-testid="essay-modal" />,
}))

describe('SearchResultsPage', () => {
  it('应该正常渲染', () => {
    renderWithProviders(<SearchResultsPage />, {
      routerProps: { initialEntries: ['/search?q=test'] },
    })
    expect(screen.getByText('test')).toBeInTheDocument()
  })

  it('应该展示搜索标签', () => {
    renderWithProviders(<SearchResultsPage />, {
      routerProps: { initialEntries: ['/search?q=react'] },
    })
    expect(screen.getByText('帖子')).toBeInTheDocument()
    expect(screen.getByText('随笔')).toBeInTheDocument()
    expect(screen.getByText('用户')).toBeInTheDocument()
  })

  it('无搜索词时展示默认状态', () => {
    renderWithProviders(<SearchResultsPage />, {
      routerProps: { initialEntries: ['/search'] },
    })
    expect(screen.getByText('...')).toBeInTheDocument()
  })

  it('无结果时展示空状态', () => {
    renderWithProviders(<SearchResultsPage />, {
      routerProps: { initialEntries: ['/search?q=test'] },
    })
    expect(screen.getByText('没有找到相关结果')).toBeInTheDocument()
  })
})
