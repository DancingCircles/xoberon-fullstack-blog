import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SearchBar from '../SearchBar'

describe('SearchBar', () => {
  it('渲染搜索输入框和默认 placeholder', () => {
    render(<SearchBar onSearch={vi.fn()} />)
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
  })

  it('自定义 placeholder', () => {
    render(<SearchBar onSearch={vi.fn()} placeholder="搜索文章..." />)
    expect(screen.getByPlaceholderText('搜索文章...')).toBeInTheDocument()
  })

  it('输入文本更新值', async () => {
    const user = userEvent.setup()
    render(<SearchBar onSearch={vi.fn()} />)
    const input = screen.getByPlaceholderText('Search...')
    await user.type(input, 'react')
    expect(input).toHaveValue('react')
  })

  it('按 Enter 触发 onSearch', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()
    render(<SearchBar onSearch={onSearch} />)
    const input = screen.getByPlaceholderText('Search...')
    await user.type(input, 'react{Enter}')
    expect(onSearch).toHaveBeenCalledWith('react')
  })

  it('空查询按 Enter 不触发 onSearch', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()
    render(<SearchBar onSearch={onSearch} />)
    const input = screen.getByPlaceholderText('Search...')
    await user.type(input, '{Enter}')
    expect(onSearch).not.toHaveBeenCalled()
  })

  it('有内容时显示清除按钮', async () => {
    const user = userEvent.setup()
    render(<SearchBar onSearch={vi.fn()} />)
    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument()
    await user.type(screen.getByPlaceholderText('Search...'), 'test')
    expect(screen.getByLabelText('Clear search')).toBeInTheDocument()
  })

  it('点击清除按钮清空输入', async () => {
    const user = userEvent.setup()
    render(<SearchBar onSearch={vi.fn()} />)
    const input = screen.getByPlaceholderText('Search...')
    await user.type(input, 'test')
    await user.click(screen.getByLabelText('Clear search'))
    expect(input).toHaveValue('')
  })

  it('自定义 className 被应用', () => {
    const { container } = render(<SearchBar onSearch={vi.fn()} className="custom-class" />)
    expect(container.querySelector('.search-bar')).toHaveClass('custom-class')
  })
})
