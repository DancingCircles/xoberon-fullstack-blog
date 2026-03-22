import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../test/test-utils'
import Navigation from '../Navigation'

import '../../../../test/mocks/gsap'

describe('Navigation', () => {
  it('渲染 logo', () => {
    renderWithProviders(<Navigation />, { routerProps: { initialEntries: ['/'] } })
    expect(screen.getByText('XOberon')).toBeInTheDocument()
  })

  it('渲染所有导航链接', () => {
    renderWithProviders(<Navigation />, { routerProps: { initialEntries: ['/'] } })
    expect(screen.getByText('HOME')).toBeInTheDocument()
    expect(screen.getByText('JOURNAL')).toBeInTheDocument()
    expect(screen.getByText('SEARCH')).toBeInTheDocument()
    expect(screen.getByText('NOTES')).toBeInTheDocument()
    expect(screen.getByText('CONTACT')).toBeInTheDocument()
  })

  it('导航链接有正确的 href', () => {
    renderWithProviders(<Navigation />, { routerProps: { initialEntries: ['/'] } })
    expect(screen.getByText('HOME').closest('a')).toHaveAttribute('href', '/')
    expect(screen.getByText('JOURNAL').closest('a')).toHaveAttribute('href', '/journal')
    expect(screen.getByText('SEARCH').closest('a')).toHaveAttribute('href', '/search')
    expect(screen.getByText('NOTES').closest('a')).toHaveAttribute('href', '/notes')
    expect(screen.getByText('CONTACT').closest('a')).toHaveAttribute('href', '/contact')
  })

  it('当前路由的链接有 active 类名', () => {
    renderWithProviders(<Navigation />, { routerProps: { initialEntries: ['/notes'] } })
    const notesLink = screen.getByText('NOTES').closest('a')
    expect(notesLink).toHaveClass('active')
  })

  it('非当前路由的链接没有 active 类名', () => {
    renderWithProviders(<Navigation />, { routerProps: { initialEntries: ['/notes'] } })
    const homeLink = screen.getByText('HOME').closest('a')
    expect(homeLink).not.toHaveClass('active')
  })

  it('渲染 profile 和 settings 按钮', () => {
    renderWithProviders(<Navigation />, { routerProps: { initialEntries: ['/'] } })
    expect(screen.getByLabelText('Profile')).toBeInTheDocument()
    expect(screen.getByLabelText('Settings')).toBeInTheDocument()
  })
})
