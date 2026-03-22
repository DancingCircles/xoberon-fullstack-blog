import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders, userEvent } from '../../../../test/test-utils'
import ContactModal from '../ContactModal'

import '../../../../test/mocks/gsap'

vi.mock('../../../../services/mockRuntime', () => ({
  submitContact: vi.fn(() => Promise.resolve()),
}))

describe('ContactModal', () => {
  it('isOpen 为 false 时不渲染', () => {
    renderWithProviders(<ContactModal isOpen={false} onClose={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('isOpen 为 true 时渲染对话框', () => {
    renderWithProviders(<ContactModal isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('有正确的无障碍属性', () => {
    renderWithProviders(<ContactModal isOpen={true} onClose={vi.fn()} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-label', 'Contact form')
  })

  it('渲染表单字段', () => {
    renderWithProviders(<ContactModal isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByPlaceholderText('FULL NAME')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('EMAIL')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('MESSAGE')).toBeInTheDocument()
  })

  it('空表单提交显示验证错误', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ContactModal isOpen={true} onClose={vi.fn()} />)
    await user.click(screen.getByText('SEND IT'))
    const errors = screen.getAllByText('REQUIRED')
    expect(errors).toHaveLength(3)
  })

  it('无效邮箱显示验证错误', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ContactModal isOpen={true} onClose={vi.fn()} />)
    await user.type(screen.getByPlaceholderText('FULL NAME'), 'X')
    await user.type(screen.getByPlaceholderText('EMAIL'), 'bad-email')
    await user.type(screen.getByPlaceholderText('MESSAGE'), 'Hello')
    await user.click(screen.getByText('SEND IT'))
    expect(screen.getByText('INVALID EMAIL')).toBeInTheDocument()
  })

  it('有效表单提交不显示错误', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ContactModal isOpen={true} onClose={vi.fn()} />)
    await user.type(screen.getByPlaceholderText('FULL NAME'), 'X')
    await user.type(screen.getByPlaceholderText('EMAIL'), 'x@example.com')
    await user.type(screen.getByPlaceholderText('MESSAGE'), 'Hello world')
    await user.click(screen.getByText('SEND IT'))
    expect(screen.queryByText('REQUIRED')).not.toBeInTheDocument()
    expect(screen.queryByText('INVALID EMAIL')).not.toBeInTheDocument()
  })

  it('输入时清除对应字段错误', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ContactModal isOpen={true} onClose={vi.fn()} />)
    await user.click(screen.getByText('SEND IT'))
    expect(screen.getAllByText('REQUIRED')).toHaveLength(3)
    await user.type(screen.getByPlaceholderText('FULL NAME'), 'X')
    await waitFor(() => {
      expect(screen.getAllByText('REQUIRED')).toHaveLength(2)
    })
  })

  it('渲染关闭按钮', () => {
    renderWithProviders(<ContactModal isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByLabelText('Close modal')).toBeInTheDocument()
  })

  it('渲染联系信息', () => {
    renderWithProviders(<ContactModal isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('X')).toBeInTheDocument()
    expect(screen.getByText('HELLO@EXAMPLE.COM')).toBeInTheDocument()
  })
})
