import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../../test/test-utils'
import DetailModal from '../DetailModal'

describe('DetailModal', () => {
  it('isOpen=false 时不渲染', () => {
    renderWithProviders(
      <DetailModal isOpen={false} onClose={vi.fn()} title="Test">
        <p>Content</p>
      </DetailModal>
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('isOpen=true 时渲染标题和内容', () => {
    renderWithProviders(
      <DetailModal isOpen={true} onClose={vi.fn()} title="Test Title">
        <p>Modal content</p>
      </DetailModal>
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Modal content')).toBeInTheDocument()
  })

  it('ESC 键触发关闭', async () => {
    const onClose = vi.fn()
    renderWithProviders(
      <DetailModal isOpen={true} onClose={onClose} title="Test">
        <p>Content</p>
      </DetailModal>
    )
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('应该渲染 footer', () => {
    renderWithProviders(
      <DetailModal isOpen={true} onClose={vi.fn()} title="Test" footer={<button>OK</button>}>
        <p>Content</p>
      </DetailModal>
    )
    expect(screen.getByText('OK')).toBeInTheDocument()
  })
})
