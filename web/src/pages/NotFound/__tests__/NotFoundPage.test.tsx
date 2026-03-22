import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../test/test-utils'
import NotFoundPage from '../NotFoundPage'

import '../../../test/mocks/gsap'

describe('NotFoundPage', () => {
  it('应该正常渲染', () => {
    renderWithProviders(<NotFoundPage />)
    expect(screen.getByLabelText('404')).toBeInTheDocument()
  })

  it('应该展示 "Page not found" 文本', () => {
    renderWithProviders(<NotFoundPage />)
    expect(screen.getByText('Page not found')).toBeInTheDocument()
  })

  it('应该展示返回首页按钮', () => {
    renderWithProviders(<NotFoundPage />)
    expect(screen.getByText('Go Home')).toBeInTheDocument()
  })
})
