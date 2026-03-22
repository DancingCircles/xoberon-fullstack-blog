import { renderHook, waitFor, act } from '@testing-library/react'
import { useOnlineCount } from '../useOnlineCount'

vi.mock('../../../services/mockRuntime', () => ({
  fetchOnlineCount: vi.fn(() => Promise.resolve(5)),
}))

describe('useOnlineCount', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('应该返回初始在线人数 0', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useOnlineCount(60000))
    // 同步 mount 后，poll 尚未 resolve，count 此时为初始值 0
    expect(result.current.count).toBe(0)
    expect(result.current.trend).toBe('stable')
    // 清理：推进所有 pending 的 Promise/timer，避免 act 警告
    await act(async () => { await Promise.resolve() })
  })

  it('应该在 poll 后更新数值', async () => {
    const { result } = renderHook(() => useOnlineCount(60000))
    await waitFor(() => {
      expect(result.current.count).toBe(5)
    })
  })
})
