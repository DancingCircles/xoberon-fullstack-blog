import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../../test/test-utils'
import EssayModal from '../EssayModal'
import type { EssayItem } from '../../../../assets/data/mockData'

import '../../../../test/mocks/gsap'

const mockEssay: EssayItem = {
  id: 'e1',
  title: 'Test Essay',
  excerpt: 'Test excerpt',
  content: 'First paragraph\n\nSecond paragraph',
  date: 'Mar 1, 2026',
  likes: 5,
  author: {
    name: 'X',
    avatar: '/avatar.png',
    handle: '@x',
  },
}

describe('EssayModal', () => {
  it('essay 为 null 时不渲染', () => {
    renderWithProviders(<EssayModal essay={null} isOpen={false} onClose={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('isOpen=true 且 essay 存在时渲染', () => {
    renderWithProviders(<EssayModal essay={mockEssay} isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Test Essay')).toBeInTheDocument()
  })

  it('应该渲染文章内容段落', () => {
    renderWithProviders(<EssayModal essay={mockEssay} isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('First paragraph')).toBeInTheDocument()
    expect(screen.getByText('Second paragraph')).toBeInTheDocument()
  })

  it('ESC 键触发关闭', async () => {
    const onClose = vi.fn()
    renderWithProviders(<EssayModal essay={mockEssay} isOpen={true} onClose={onClose} />)
    await userEvent.keyboard('{Escape}')
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('应该展示关闭按钮', () => {
    renderWithProviders(<EssayModal essay={mockEssay} isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })
})
