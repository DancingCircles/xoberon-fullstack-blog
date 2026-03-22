import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../test/test-utils'
import AdminLayout from '../AdminLayout'

vi.mock('../../AdminSidebar', () => ({
  default: () => <nav data-testid="admin-sidebar">Sidebar</nav>,
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet">Page Content</div>,
  }
})

describe('AdminLayout', () => {
  it('应该渲染 sidebar 和 content 区域', () => {
    renderWithProviders(<AdminLayout />)
    expect(screen.getByTestId('admin-sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('outlet')).toBeInTheDocument()
  })

  it('应该有 admin-layout class', () => {
    const { container } = renderWithProviders(<AdminLayout />)
    expect(container.querySelector('.admin-layout')).toBeInTheDocument()
  })
})
