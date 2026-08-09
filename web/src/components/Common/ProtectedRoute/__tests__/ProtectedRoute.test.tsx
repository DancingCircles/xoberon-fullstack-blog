import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders } from '../../../../test/test-utils'
import ProtectedRoute from '../ProtectedRoute'

describe('ProtectedRoute', () => {
  const routedSubject = (
    <Routes>
      <Route path="/create-post" element={<ProtectedRoute><p>Protected</p></ProtectedRoute>} />
      <Route path="/login" element={<p>Login</p>} />
    </Routes>
  )

  it('shows a loading state while authentication is being checked', () => {
    renderWithProviders(
      routedSubject,
      { auth: { isChecking: true, isAuthenticated: false }, routerProps: { initialEntries: ['/create-post'] } }
    )
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('Protected')).not.toBeInTheDocument()
  })

  it('未登录时重定向', () => {
    renderWithProviders(
      routedSubject,
      { auth: { isAuthenticated: false }, routerProps: { initialEntries: ['/create-post'] } }
    )
    expect(screen.queryByText('Protected')).not.toBeInTheDocument()
    expect(screen.getByText('Login')).toBeInTheDocument()
  })

  it('已登录时展示内容', () => {
    renderWithProviders(
      routedSubject,
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
