const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
const DEFAULT_TIMEOUT = 15_000

const AUTH_TOKEN_KEY = 'xoberon-token'

export class ApiError extends Error {
  status: number
  code: 'HTTP' | 'TIMEOUT' | 'NETWORK'
  body?: string

  constructor(status: number, code: 'HTTP' | 'TIMEOUT' | 'NETWORK', body?: string) {
    const label = code === 'TIMEOUT' ? '请求超时' : code === 'NETWORK' ? '网络错误' : `HTTP ${status}`
    super(label)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.body = body
  }
}

export function isNetworkError(err: unknown): err is ApiError {
  return err instanceof ApiError && err.code === 'NETWORK'
}

export function isTimeoutError(err: unknown): err is ApiError {
  return err instanceof ApiError && err.code === 'TIMEOUT'
}

function isTechnicalMessage(msg: string): boolean {
  return (
    msg.includes('字段验证失败') ||
    msg.includes('Key:') ||
    msg.includes('Error:') ||
    /^[A-Z][a-zA-Z]+\.[A-Z]/.test(msg)
  )
}

/**
 * 从错误对象中提取面向用户的友好提示。
 * 网络/超时/429 等通用错误自动映射为中文，
 * 业务错误尝试解析后端 JSON body 中的 message 字段，
 * 兜底使用调用方传入的 fallback。
 */
export function friendlyErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof ApiError)) return fallback
  if (err.code === 'NETWORK') return '无法连接到服务器，请检查网络连接'
  if (err.code === 'TIMEOUT') return '请求超时，请稍后重试'
  if (err.status === 429) return '操作太频繁，请稍后再试'
  if (err.status === 502 || err.status === 503) return '服务器暂时不可用，请稍后重试'

  if (err.body) {
    try {
      const parsed = JSON.parse(err.body) as { message?: string }
      const msg = parsed.message?.trim()
      if (msg && !isTechnicalMessage(msg)) return msg
    } catch {
      const raw = err.body.trim()
      if (raw && !isTechnicalMessage(raw)) return raw
    }
  }

  return fallback
}

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY)
  } catch { return null }
}

export function setAuthToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY)
}

interface RequestOptions extends RequestInit {
  timeout?: number
}

async function request<T>(path: string, options?: RequestOptions): Promise<T> {
  const { timeout = DEFAULT_TIMEOUT, ...fetchOptions } = options ?? {}

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(fetchOptions.headers as Record<string, string> | undefined),
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    })

    if (res.status === 401) {
      clearAuthToken()
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new ApiError(res.status, 'HTTP', body)
    }

    return res.json() as Promise<T>
  } catch (err) {
    if (err instanceof ApiError) throw err
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(0, 'TIMEOUT')
    }
    throw new ApiError(0, 'NETWORK')
  } finally {
    clearTimeout(timer)
  }
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, options),

  post: <T>(path: string, data: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body: JSON.stringify(data) }),

  put: <T>(path: string, data?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', ...(data !== undefined ? { body: JSON.stringify(data) } : {}) }),

  patch: <T>(path: string, data: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body: JSON.stringify(data) }),

  delete: <T>(path: string, data?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE', ...(data !== undefined ? { body: JSON.stringify(data) } : {}) }),
}
