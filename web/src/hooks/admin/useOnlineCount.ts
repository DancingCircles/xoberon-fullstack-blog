import { useState, useEffect, useRef } from 'react'
import { fetchOnlineCount } from '../../services/mockRuntime'

/**
 * 每 intervalMs 毫秒轮询后端在线人数接口，返回真实数据。
 */
export function useOnlineCount(
  intervalMs = 10_000,
): { count: number; trend: 'up' | 'down' | 'stable' } {
  const [count, setCount] = useState(0)
  const [prev, setPrev] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      try {
        const n = await fetchOnlineCount()
        if (cancelled) return
        setCount(current => {
          setPrev(current)
          return n
        })
      } catch {
        // 网络异常静默处理，保持上次数值
      }
    }

    poll()
    timerRef.current = setInterval(poll, intervalMs)

    return () => {
      cancelled = true
      clearInterval(timerRef.current)
    }
  }, [intervalMs])

  const trend: 'up' | 'down' | 'stable' =
    count > prev ? 'up' : count < prev ? 'down' : 'stable'

  return { count, trend }
}
