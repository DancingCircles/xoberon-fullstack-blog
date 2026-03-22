import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../test/test-utils'
import ProtectedRoute from '../ProtectedRoute'

describe('ProtectedRoute', () => {
  it('未登录时重定向', () => {
    renderWithProviders(
      <ProtectedRoute><p>Protected</p></ProtectedRoute>,
      { auth: { isAuthenticated: false }, routerProps: { initialEntries: ['/create-post'] } }
    )
    expect(screen.queryByText('Protected')).not.toBeInTheDocument()
  })

  it('已登录时展示内容', () => {
    renderWithProviders(
      <ProtectedRoute><p>Protected</p></ProtectedRoute>,
      {
        auth: {
          isAuthenticated: true,
          currentUser: { id: '1', name: 'X', handle: '@x', avatar: '/av.png', bio: '', role: 'user' as const, postCount: 0, essayCount: 0 },
        },
        routerProps: { initialEntries: ['/create-post'] },
      }
    )
    expect(screen.getByText('Protected')).toBeInTheDocument()
  })
})
