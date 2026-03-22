import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../../test/test-utils'
import WritePostModal from '../WritePostModal'

import '../../../../test/mocks/gsap'
import '../../../../test/mocks/react-markdown'

describe('WritePostModal', () => {
  const authedAuth = {
    currentUser: { id: '1', name: 'X', handle: '@x', avatar: '/av.png', bio: 'bio', role: 'user' as const, postCount: 0, essayCount: 0 },
    isAuthenticated: true,
  }

  it('isOpen=false 时不渲染', () => {
    renderWithProviders(<WritePostModal isOpen={false} onClose={vi.fn()} />, { auth: authedAuth })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('isOpen=true 时渲染', () => {
    renderWithProviders(<WritePostModal isOpen={true} onClose={vi.fn()} />, { auth: authedAuth })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('ESC 键触发关闭', async () => {
    const onClose = vi.fn()
    renderWithProviders(<WritePostModal isOpen={true} onClose={onClose} />, { auth: authedAuth })
    await userEvent.keyboard('{Escape}')
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('应该展示表单字段', () => {
    renderWithProviders(<WritePostModal isOpen={true} onClose={vi.fn()} />, { auth: authedAuth })
    expect(screen.getByPlaceholderText(/title/i)).toBeInTheDocument()
  })
})
