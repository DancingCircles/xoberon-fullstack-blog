import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../test/test-utils'
import MarkdownRenderer from '../MarkdownRenderer'

import '../../../../test/mocks/react-markdown'

describe('MarkdownRenderer', () => {
  it('应该正常渲染文本内容', () => {
    renderWithProviders(<MarkdownRenderer content="Hello World" />)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('应该有 markdown-content class 容器', () => {
    const { container } = renderWithProviders(<MarkdownRenderer content="test" />)
    expect(container.querySelector('.markdown-content')).toBeInTheDocument()
  })

  it('应该渲染 markdown 标题', () => {
    renderWithProviders(<MarkdownRenderer content="# Title" />)
    expect(screen.getByText('Title')).toBeInTheDocument()
  })
})
