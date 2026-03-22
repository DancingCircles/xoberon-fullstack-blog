import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../test/test-utils'
import AdminContactsPage from '../AdminContactsPage'

vi.mock('../../../../services/mockRuntime', () => ({
  fetchAdminContacts: vi.fn(() =>
    Promise.resolve({ items: [], total: 0 })
  ),
  markContactRead: vi.fn(),
}))

describe('AdminContactsPage', () => {
  const adminAuth = {
    currentUser: { id: '1', name: 'admin', handle: '@admin', avatar: '', bio: '', role: 'admin' as const, postCount: 0, essayCount: 0 },
    isAuthenticated: true,
    isAdmin: true,
  }

  it('应该正常渲染标题', async () => {
    renderWithProviders(<AdminContactsPage />, { auth: adminAuth })
    await waitFor(() => expect(screen.getByText('Contacts')).toBeInTheDocument())
  })

  it('应该展示已读过滤标签', async () => {
    renderWithProviders(<AdminContactsPage />, { auth: adminAuth })
    await waitFor(() => {
      expect(screen.getByText('未读')).toBeInTheDocument()
      expect(screen.getByText('已读')).toBeInTheDocument()
    })
  })

  it('空状态应该展示提示文本', async () => {
    renderWithProviders(<AdminContactsPage />, { auth: adminAuth })
    await waitFor(() => expect(screen.getByText('没有联系消息')).toBeInTheDocument())
  })
})
