import { useEffect, useRef } from 'react'
import { sendHeartbeat } from '../../services/mockRuntime'
import { getAuthToken } from '../../services/api'

const HEARTBEAT_INTERVAL = 30_000

/**
 * 用户登录后每 30 秒向后端发送心跳，维护在线状态。
 * token 不存在时不发送。
 */
export function useHeartbeat() {
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  useEffect(() => {
    const beat = () => {
      if (getAuthToken()) {
        sendHeartbeat().catch(() => {})
      }
    }

    beat()
    timerRef.current = setInterval(beat, HEARTBEAT_INTERVAL)

    return () => clearInterval(timerRef.current)
  }, [])
}
