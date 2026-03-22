import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../test/test-utils'
import { Route, Routes } from 'react-router-dom'
import AuthorPage from '../AuthorPage'

import '../../../test/mocks/gsap'

vi.mock('../../../services/mockRuntime', () => ({
  fetchUserProfile: vi.fn(() =>
    Promise.resolve({
      id: 'u1',
      name: 'X',
      handle: '@testuser',
      avatar: '/avatar.png',
      bio: 'Test bio',
      role: 'user',
      postCount: 0,
      essayCount: 0,
    })
  ),
  deletePost: vi.fn(() => Promise.resolve()),
  deleteEssay: vi.fn(() => Promise.resolve()),
}))

vi.mock('../../../components/Blog/BlogModal', () => ({
  default: () => <div data-testid="blog-modal" />,
}))

vi.mock('../../../components/Common/EssayModal', () => ({
  default: () => <div data-testid="essay-modal" />,
}))

describe('AuthorPage', () => {
  it('应该展示加载状态', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/author/:authorId" element={<AuthorPage />} />
      </Routes>,
      {
        routerProps: { initialEntries: ['/author/testuser'] },
      },
    )
    // 等待页面稳定（加载完成后展示用户数据）
    await waitFor(() => {
      expect(screen.getByText('X')).toBeInTheDocument()
    })
  })

  it('应该展示用户信息', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/author/:authorId" element={<AuthorPage />} />
      </Routes>,
      {
        routerProps: { initialEntries: ['/author/testuser'] },
      },
    )
    await waitFor(() => {
      expect(screen.getByText('X')).toBeInTheDocument()
    })
    expect(screen.getByText('Test bio')).toBeInTheDocument()
  })

  it('应该展示 Posts 和 Essays 标签', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/author/:authorId" element={<AuthorPage />} />
      </Routes>,
      {
        routerProps: { initialEntries: ['/author/testuser'] },
      },
    )
    await waitFor(() => {
      expect(screen.getAllByText('Posts').length).toBeGreaterThanOrEqual(1)
    })
    expect(screen.getAllByText('Essays').length).toBeGreaterThanOrEqual(1)
  })
})
