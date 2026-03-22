import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../test/test-utils'
import AdminRoute from '../AdminRoute'

describe('AdminRoute', () => {
  it('未登录时重定向', () => {
    renderWithProviders(
      <AdminRoute><p>Admin Content</p></AdminRoute>,
      { auth: { isAuthenticated: false, isAdmin: false }, routerProps: { initialEntries: ['/admin'] } }
    )
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('非管理员时重定向', () => {
    renderWithProviders(
      <AdminRoute><p>Admin Content</p></AdminRoute>,
      {
        auth: {
          isAuthenticated: true,
          isAdmin: false,
          currentUser: { id: '1', name: 'X', handle: '@x', avatar: '/av.png', bio: '', role: 'user' as const, postCount: 0, essayCount: 0 },
        },
        routerProps: { initialEntries: ['/admin'] },
      }
    )
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('管理员可以看到内容', () => {
    renderWithProviders(
      <AdminRoute><p>Admin Content</p></AdminRoute>,
      {
        auth: {
          isAuthenticated: true,
          isAdmin: true,
          currentUser: { id: '1', name: 'X', handle: '@x', avatar: '/av.png', bio: '', role: 'admin' as const, postCount: 0, essayCount: 0 },
        },
        routerProps: { initialEntries: ['/admin'] },
      }
    )
    expect(screen.getByText('Admin Content')).toBeInTheDocument()
  })
})
