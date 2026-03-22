import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { render, screen } from '@testing-library/react'
import ToastProvider from '../toast/ToastProvider'
import { useToast } from '../../hooks/social/useToast'
import type { ReactNode } from 'react'

import '../../test/mocks/gsap'

function wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
}

describe('ToastProvider', () => {
  it('初始状态无 toast 消息', () => {
    const { result } = renderHook(() => useToast(), { wrapper })
    expect(result.current.toast).toBeDefined()
    expect(result.current.toast.success).toBeInstanceOf(Function)
  })

  it('toast.success 添加 success 消息', () => {
    function TestComponent() {
      const { toast } = useToast()
      return <button onClick={() => toast.success('Done!')}>Trigger</button>
    }
    render(<ToastProvider><TestComponent /></ToastProvider>)
    act(() => screen.getByText('Trigger').click())
    expect(screen.getByText('Done!')).toBeInTheDocument()
  })

  it('toast.error 添加 error 消息', () => {
    function TestComponent() {
      const { toast } = useToast()
      return <button onClick={() => toast.error('Failed!')}>Trigger</button>
    }
    render(<ToastProvider><TestComponent /></ToastProvider>)
    act(() => screen.getByText('Trigger').click())
    expect(screen.getByText('Failed!')).toBeInTheDocument()
  })

  it('toast.warning 添加 warning 消息', () => {
    function TestComponent() {
      const { toast } = useToast()
      return <button onClick={() => toast.warning('Careful!')}>Trigger</button>
    }
    render(<ToastProvider><TestComponent /></ToastProvider>)
    act(() => screen.getByText('Trigger').click())
    expect(screen.getByText('Careful!')).toBeInTheDocument()
  })

  it('toast.info 添加 info 消息', () => {
    function TestComponent() {
      const { toast } = useToast()
      return <button onClick={() => toast.info('FYI')}>Trigger</button>
    }
    render(<ToastProvider><TestComponent /></ToastProvider>)
    act(() => screen.getByText('Trigger').click())
    expect(screen.getByText('FYI')).toBeInTheDocument()
  })

  it('最多显示 5 条消息', () => {
    function TestComponent() {
      const { toast } = useToast()
      return (
        <button onClick={() => {
          for (let i = 1; i <= 7; i++) toast.success(`Msg ${i}`)
        }}>Trigger</button>
      )
    }
    render(<ToastProvider><TestComponent /></ToastProvider>)
    act(() => screen.getByText('Trigger').click())
    const statuses = screen.getAllByRole('status')
    expect(statuses.length).toBeLessThanOrEqual(5)
  })

  it('超时后自动移除消息', async () => {
    vi.useFakeTimers()
    function TestComponent() {
      const { toast } = useToast()
      return <button onClick={() => toast.success('Temp')}>Trigger</button>
    }
    render(<ToastProvider><TestComponent /></ToastProvider>)
    act(() => screen.getByText('Trigger').click())
    expect(screen.getByText('Temp')).toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(4000) })
    expect(screen.queryByText('Temp')).not.toBeInTheDocument()
    vi.useRealTimers()
  })
})
