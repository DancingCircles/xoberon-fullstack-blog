import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../test/test-utils'
import AdminUsersPage from '../AdminUsersPage'

vi.mock('../../../../services/mockRuntime', () => ({
  fetchAdminUsers: vi.fn(() =>
    Promise.resolve({ items: [], total: 0 })
  ),
  updateUserRole: vi.fn(),
}))

describe('AdminUsersPage', () => {
  const adminAuth = {
    currentUser: { id: '1', name: 'admin', handle: '@admin', avatar: '', bio: '', role: 'admin' as const, postCount: 0, essayCount: 0 },
    isAuthenticated: true,
    isAdmin: true,
  }

  it('应该正常渲染标题', async () => {
    renderWithProviders(<AdminUsersPage />, { auth: adminAuth })
    await waitFor(() => expect(screen.getByText('Users')).toBeInTheDocument())
  })

  it('应该展示搜索框', async () => {
    renderWithProviders(<AdminUsersPage />, { auth: adminAuth })
    await waitFor(() =>
      expect(screen.getByPlaceholderText('搜索用户名 / Handle / 邮箱…')).toBeInTheDocument()
    )
  })

  it('应该展示角色过滤标签', async () => {
    renderWithProviders(<AdminUsersPage />, { auth: adminAuth })
    await waitFor(() => {
      expect(screen.getByText('Admin')).toBeInTheDocument()
      expect(screen.getByText('User')).toBeInTheDocument()
    })
  })

  it('空状态应该展示提示文本', async () => {
    renderWithProviders(<AdminUsersPage />, { auth: adminAuth })
    await waitFor(() => expect(screen.getByText('没有符合条件的用户')).toBeInTheDocument())
  })
})
