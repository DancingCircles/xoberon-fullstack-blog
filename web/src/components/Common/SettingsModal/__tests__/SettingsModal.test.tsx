import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../../test/test-utils'
import SettingsModal from '../SettingsModal'

import '../../../../test/mocks/gsap'

vi.mock('../../../../services/mockRuntime', () => ({
  changePasswordApi: vi.fn(),
}))

describe('SettingsModal', () => {
  const authedAuth = {
    currentUser: { id: '1', name: 'X', handle: '@x', avatar: '/av.png', bio: 'bio', role: 'user' as const, postCount: 0, essayCount: 0 },
    isAuthenticated: true,
    logout: vi.fn(() => Promise.resolve()),
  }

  it('isOpen=false 时不渲染', () => {
    renderWithProviders(<SettingsModal isOpen={false} onClose={vi.fn()} />, { auth: authedAuth })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('isOpen=true 时渲染', () => {
    renderWithProviders(<SettingsModal isOpen={true} onClose={vi.fn()} />, { auth: authedAuth })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('ESC 键触发关闭', async () => {
    const onClose = vi.fn()
    renderWithProviders(<SettingsModal isOpen={true} onClose={onClose} />, { auth: authedAuth })
    await userEvent.keyboard('{Escape}')
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('应该展示设置导航项', () => {
    renderWithProviders(<SettingsModal isOpen={true} onClose={vi.fn()} />, { auth: authedAuth })
    expect(screen.getAllByText('个人资料').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('账号管理')).toBeInTheDocument()
  })
})
