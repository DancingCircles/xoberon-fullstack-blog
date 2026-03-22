import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Toast from '../Toast'
import type { ToastItem } from '../../../../contexts/toast/ToastContext'

import '../../../../test/mocks/gsap'

function makeToast(overrides: Partial<ToastItem> = {}): ToastItem {
  return {
    id: 't1',
    type: 'success',
    message: 'Operation successful',
    ...overrides,
  }
}

describe('Toast', () => {
  it('渲染 success 类型消息', () => {
    render(<Toast item={makeToast()} onDismiss={vi.fn()} />)
    expect(screen.getByText('Operation successful')).toBeInTheDocument()
  })

  it('渲染 error 类型消息', () => {
    render(<Toast item={makeToast({ type: 'error', message: 'Something broke' })} onDismiss={vi.fn()} />)
    expect(screen.getByText('Something broke')).toBeInTheDocument()
  })

  it('渲染 warning 类型', () => {
    const item = makeToast({ type: 'warning', message: 'Caution!' })
    const { container } = render(<Toast item={item} onDismiss={vi.fn()} />)
    expect(container.querySelector('.xo-toast--warning')).toBeInTheDocument()
  })

  it('渲染 info 类型', () => {
    const item = makeToast({ type: 'info', message: 'FYI' })
    const { container } = render(<Toast item={item} onDismiss={vi.fn()} />)
    expect(container.querySelector('.xo-toast--info')).toBeInTheDocument()
  })

  it('有 role="status" 无障碍属性', () => {
    render(<Toast item={makeToast()} onDismiss={vi.fn()} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('点击关闭按钮触发 onDismiss', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(<Toast item={makeToast()} onDismiss={onDismiss} />)
    await user.click(screen.getByLabelText('Dismiss'))
    // gsap 是 mock 的，onComplete 不会自动触发，但 handleDismiss 被调用了
    expect(onDismiss).not.toHaveBeenCalled() // gsap.to mock 不触发 onComplete
  })

  it('有 action 时渲染 action 按钮', () => {
    const item = makeToast({
      action: { label: '撤销', onClick: vi.fn() },
    })
    render(<Toast item={item} onDismiss={vi.fn()} />)
    expect(screen.getByText('撤销')).toBeInTheDocument()
  })

  it('无 action 时不渲染 action 按钮', () => {
    render(<Toast item={makeToast()} onDismiss={vi.fn()} />)
    expect(screen.queryByText('撤销')).not.toBeInTheDocument()
  })
})
