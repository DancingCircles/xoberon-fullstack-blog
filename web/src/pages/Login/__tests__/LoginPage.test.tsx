import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, userEvent } from '../../../test/test-utils'
import LoginPage from '../LoginPage'

import '../../../test/mocks/gsap'

describe('LoginPage', () => {
  it('默认渲染登录表单', () => {
    renderWithProviders(<LoginPage />, { routerProps: { initialEntries: ['/login'] } })
    expect(screen.getByText('Sign In')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
  })

  it('登录模式无 Email 字段', () => {
    renderWithProviders(<LoginPage />, { routerProps: { initialEntries: ['/login'] } })
    expect(screen.queryByPlaceholderText('Email')).not.toBeInTheDocument()
  })

  it('点击 Sign Up 切换到注册模式', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />, { routerProps: { initialEntries: ['/login'] } })
    await user.click(screen.getByText('Sign Up'))
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument()
  })

  it('注册模式点击 Sign In 切回登录模式', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />, { routerProps: { initialEntries: ['/login'] } })
    await user.click(screen.getByText('Sign Up'))
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
    await user.click(screen.getByText('Sign In'))
    expect(screen.queryByPlaceholderText('Email')).not.toBeInTheDocument()
  })

  it('空用户名提交登录时提示', async () => {
    const user = userEvent.setup()
    const { mockToast } = renderWithProviders(<LoginPage />, {
      routerProps: { initialEntries: ['/login'] },
    })
    await user.type(screen.getByPlaceholderText('Password'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))
    expect(mockToast.info).toHaveBeenCalledWith('请输入用户名')
  })

  it('空密码提交登录时提示', async () => {
    const user = userEvent.setup()
    const { mockToast } = renderWithProviders(<LoginPage />, {
      routerProps: { initialEntries: ['/login'] },
    })
    await user.type(screen.getByPlaceholderText('Username'), 'testuser')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))
    expect(mockToast.info).toHaveBeenCalledWith('请输入密码')
  })

  it('登录失败时显示错误 toast', async () => {
    const user = userEvent.setup()
    const login = vi.fn(() => Promise.resolve({ ok: false, message: '用户名或密码错误' }))
    const { mockToast } = renderWithProviders(<LoginPage />, {
      routerProps: { initialEntries: ['/login'] },
      auth: { login },
    })
    await user.type(screen.getByPlaceholderText('Username'), 'baduser')
    await user.type(screen.getByPlaceholderText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))
    expect(login).toHaveBeenCalledWith('baduser', 'wrong')
    expect(mockToast.error).toHaveBeenCalledWith('用户名或密码错误')
  })

  it('登录成功时显示成功 toast', async () => {
    const user = userEvent.setup()
    const login = vi.fn(() => Promise.resolve({ ok: true }))
    const { mockToast } = renderWithProviders(<LoginPage />, {
      routerProps: { initialEntries: ['/login'] },
      auth: { login },
    })
    await user.type(screen.getByPlaceholderText('Username'), 'okuser')
    await user.type(screen.getByPlaceholderText('Password'), 'correct')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))
    expect(mockToast.success).toHaveBeenCalledWith('登录成功')
  })

  it('密码切换可见性', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />, { routerProps: { initialEntries: ['/login'] } })
    const pwInput = screen.getByPlaceholderText('Password')
    expect(pwInput).toHaveAttribute('type', 'password')
    await user.click(screen.getByLabelText('Show password'))
    expect(pwInput).toHaveAttribute('type', 'text')
    await user.click(screen.getByLabelText('Hide password'))
    expect(pwInput).toHaveAttribute('type', 'password')
  })

  it('渲染模式切换提示文字', () => {
    renderWithProviders(<LoginPage />, { routerProps: { initialEntries: ['/login'] } })
    expect(screen.getByText("Don't have an account?")).toBeInTheDocument()
  })
})
