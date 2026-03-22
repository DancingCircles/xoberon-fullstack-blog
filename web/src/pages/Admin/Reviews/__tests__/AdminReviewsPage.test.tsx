import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../test/test-utils'
import AdminReviewsPage from '../AdminReviewsPage'

vi.mock('../../../../services/mockRuntime', () => ({
  fetchAdminReviews: vi.fn(() => Promise.resolve([])),
  reviewApprove: vi.fn(),
  reviewReject: vi.fn(),
}))

describe('AdminReviewsPage', () => {
  const adminAuth = {
    currentUser: { id: '1', name: 'admin', handle: '@admin', avatar: '', bio: '', role: 'admin' as const, postCount: 0, essayCount: 0 },
    isAuthenticated: true,
    isAdmin: true,
  }

  it('应该正常渲染标题', async () => {
    renderWithProviders(<AdminReviewsPage />, { auth: adminAuth })
    await waitFor(() => expect(screen.getByText('Content Review')).toBeInTheDocument())
  })

  it('应该展示状态过滤标签', async () => {
    renderWithProviders(<AdminReviewsPage />, { auth: adminAuth })
    await waitFor(() => {
      expect(screen.getByText('待审核')).toBeInTheDocument()
      expect(screen.getByText('已通过')).toBeInTheDocument()
      expect(screen.getByText('已删除')).toBeInTheDocument()
    })
  })

  it('应该展示类型过滤标签', async () => {
    renderWithProviders(<AdminReviewsPage />, { auth: adminAuth })
    await waitFor(() => {
      expect(screen.getByText('文章')).toBeInTheDocument()
      expect(screen.getByText('随笔')).toBeInTheDocument()
      expect(screen.getByText('评论')).toBeInTheDocument()
    })
  })

  it('空状态应该展示提示文本', async () => {
    renderWithProviders(<AdminReviewsPage />, { auth: adminAuth })
    await waitFor(() => expect(screen.getByText('没有符合条件的审核内容')).toBeInTheDocument())
  })
})
