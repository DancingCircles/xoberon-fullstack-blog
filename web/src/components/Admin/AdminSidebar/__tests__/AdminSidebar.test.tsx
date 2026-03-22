import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../test/test-utils'
import AdminSidebar from '../AdminSidebar'

describe('AdminSidebar', () => {
  const authedAuth = {
    currentUser: { id: '1', name: 'X', handle: '@x', avatar: '/av.png', bio: 'bio', role: 'admin' as const, postCount: 0, essayCount: 0 },
    isAuthenticated: true,
  }

  it('应该渲染导航链接', () => {
    renderWithProviders(<AdminSidebar />, { auth: authedAuth, routerProps: { initialEntries: ['/admin/dashboard'] } })
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Content Review')).toBeInTheDocument()
    expect(screen.getByText('Users')).toBeInTheDocument()
    expect(screen.getByText('Contacts')).toBeInTheDocument()
  })

  it('应该展示 XOberon 品牌', () => {
    renderWithProviders(<AdminSidebar />, { auth: authedAuth, routerProps: { initialEntries: ['/admin/dashboard'] } })
    expect(screen.getByText('XOberon')).toBeInTheDocument()
    expect(screen.getByText('ADMIN')).toBeInTheDocument()
  })

  it('应该展示用户信息', () => {
    renderWithProviders(<AdminSidebar />, { auth: authedAuth, routerProps: { initialEntries: ['/admin/dashboard'] } })
    expect(screen.getByText('X')).toBeInTheDocument()
  })

  it('应该展示返回按钮', () => {
    renderWithProviders(<AdminSidebar />, { auth: authedAuth, routerProps: { initialEntries: ['/admin/dashboard'] } })
    expect(screen.getByText('Back to Site')).toBeInTheDocument()
  })
})
