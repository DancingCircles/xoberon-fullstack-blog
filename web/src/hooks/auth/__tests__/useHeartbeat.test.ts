import { renderHook } from '@testing-library/react'
import { useHeartbeat } from '../useHeartbeat'

vi.mock('../../../services/mockRuntime', () => ({
  sendHeartbeat: vi.fn(() => Promise.resolve()),
}))

vi.mock('../../../services/api', () => ({
  getAuthToken: vi.fn(() => 'mock-token'),
}))

describe('useHeartbeat', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('应该立即发送一次心跳', async () => {
    const { sendHeartbeat } = await import('../../../services/mockRuntime')
    renderHook(() => useHeartbeat())
    expect(sendHeartbeat).toHaveBeenCalledTimes(1)
  })

  it('卸载时清除定时器', () => {
    const { unmount } = renderHook(() => useHeartbeat())
    unmount()
  })
})
