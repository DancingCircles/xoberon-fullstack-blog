import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../test/test-utils'
import AdminDashboardPage from '../AdminDashboardPage'

vi.mock('../../../../services/mockRuntime', () => ({
  fetchAdminStats: vi.fn(() =>
    Promise.resolve({
      totalUsers: 42,
      totalPosts: 100,
      totalEssays: 50,
      pendingReviews: 3,
      unreadContacts: 5,
    })
  ),
  fetchAdminActivities: vi.fn(() => Promise.resolve([])),
}))

vi.mock('../../../../hooks/admin/useOnlineCount', () => ({
  useOnlineCount: () => ({ count: 7 }),
}))

describe('AdminDashboardPage', () => {
  const adminAuth = {
    currentUser: { id: '1', name: 'admin', handle: '@admin', avatar: '', bio: '', role: 'admin' as const, postCount: 0, essayCount: 0 },
    isAuthenticated: true,
    isAdmin: true,
  }

  it('应该正常渲染标题', async () => {
    renderWithProviders(<AdminDashboardPage />, { auth: adminAuth })
    await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument())
  })

  it('应该展示统计卡片标签', async () => {
    renderWithProviders(<AdminDashboardPage />, { auth: adminAuth })
    await waitFor(() => {
      expect(screen.getByText('当前在线')).toBeInTheDocument()
      expect(screen.getByText('注册用户')).toBeInTheDocument()
      expect(screen.getByText('文章总数')).toBeInTheDocument()
      expect(screen.getByText('待审核')).toBeInTheDocument()
      expect(screen.getByText('未读消息')).toBeInTheDocument()
    })
  })

  it('应该展示最近活动区域', async () => {
    renderWithProviders(<AdminDashboardPage />, { auth: adminAuth })
    await waitFor(() => expect(screen.getByText('最近活动')).toBeInTheDocument())
  })
})
