import {
  ApiError,
  isNetworkError,
  isTimeoutError,
  friendlyErrorMessage,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  api,
} from '../api'

describe('ApiError', () => {
  it('HTTP 错误包含状态码', () => {
    const err = new ApiError(404, 'HTTP', 'not found')
    expect(err.status).toBe(404)
    expect(err.code).toBe('HTTP')
    expect(err.body).toBe('not found')
    expect(err.message).toBe('HTTP 404')
  })

  it('TIMEOUT 错误', () => {
    const err = new ApiError(0, 'TIMEOUT')
    expect(err.message).toBe('请求超时')
  })

  it('NETWORK 错误', () => {
    const err = new ApiError(0, 'NETWORK')
    expect(err.message).toBe('网络错误')
  })
})

describe('isNetworkError / isTimeoutError', () => {
  it('识别网络错误', () => {
    expect(isNetworkError(new ApiError(0, 'NETWORK'))).toBe(true)
    expect(isNetworkError(new ApiError(0, 'TIMEOUT'))).toBe(false)
    expect(isNetworkError(new Error('fail'))).toBe(false)
  })

  it('识别超时错误', () => {
    expect(isTimeoutError(new ApiError(0, 'TIMEOUT'))).toBe(true)
    expect(isTimeoutError(new ApiError(0, 'NETWORK'))).toBe(false)
  })
})

describe('friendlyErrorMessage', () => {
  it('非 ApiError 返回 fallback', () => {
    expect(friendlyErrorMessage(new Error('x'), '操作失败')).toBe('操作失败')
  })

  it('网络错误返回固定提示', () => {
    expect(friendlyErrorMessage(new ApiError(0, 'NETWORK'), '操作失败')).toBe('无法连接到服务器，请检查网络连接')
  })

  it('超时错误返回固定提示', () => {
    expect(friendlyErrorMessage(new ApiError(0, 'TIMEOUT'), '操作失败')).toBe('请求超时，请稍后重试')
  })

  it('429 返回频率限制提示', () => {
    expect(friendlyErrorMessage(new ApiError(429, 'HTTP'), '操作失败')).toBe('操作太频繁，请稍后再试')
  })

  it('解析 body 中的 message', () => {
    const err = new ApiError(400, 'HTTP', JSON.stringify({ message: '用户名已存在' }))
    expect(friendlyErrorMessage(err, '操作失败')).toBe('用户名已存在')
  })

  it('技术类 message 降级为 fallback', () => {
    const err = new ApiError(400, 'HTTP', JSON.stringify({ message: 'Key: email Error: required' }))
    expect(friendlyErrorMessage(err, '操作失败')).toBe('操作失败')
  })
})

describe('token 管理', () => {
  beforeEach(() => localStorage.clear())

  it('setAuthToken / getAuthToken', () => {
    setAuthToken('abc123')
    expect(getAuthToken()).toBe('abc123')
  })

  it('clearAuthToken', () => {
    setAuthToken('abc123')
    clearAuthToken()
    expect(getAuthToken()).toBeNull()
  })
})

describe('api 请求方法', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    localStorage.clear()
  })

  it('GET 请求成功', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'ok' }),
      } as Response)
    )

    const result = await api.get<{ data: string }>('/test')
    expect(result).toEqual({ data: 'ok' })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({ headers: expect.objectContaining({ 'Content-Type': 'application/json' }) })
    )
  })

  it('POST 请求发送 JSON body', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: '1' }),
      } as Response)
    )

    await api.post('/items', { name: 'test' })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/items'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'test' }) })
    )
  })

  it('401 响应清除 token 并派发事件', async () => {
    setAuthToken('old-token')
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        text: () => Promise.resolve('unauthorized'),
      } as Response)
    )

    await expect(api.get('/protected')).rejects.toThrow(ApiError)
    expect(getAuthToken()).toBeNull()
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'auth:unauthorized' }))
    dispatchSpy.mockRestore()
  })

  it('自动注入 Authorization 头', async () => {
    setAuthToken('my-token')
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      } as Response)
    )

    await api.get('/data')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer my-token' }),
      })
    )
  })

  it('fetch 失败抛出 NETWORK 错误', async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('network fail')))

    await expect(api.get('/fail')).rejects.toThrow(ApiError)
    try {
      await api.get('/fail')
    } catch (e) {
      expect((e as ApiError).code).toBe('NETWORK')
    }
  })
})
