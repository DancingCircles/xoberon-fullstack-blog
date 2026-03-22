import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BlogCard from '../BlogCard'
import type { BlogPost } from '../../../../assets/data/types'

const mockPost: BlogPost = {
  id: 'p1',
  title: 'Test Article Title',
  excerpt: 'This is a test excerpt for the blog card.',
  content: 'Full content here',
  date: 'Oct 24, 2025',
  category: 'Tech',
  slug: 'test-article',
  readTime: 5,
  tags: ['react', 'testing', 'vitest'],
  likes: 42,
  author: { name: 'X', avatar: 'https://example.com/avatar.png', handle: '@x' },
  comments: [],
}

describe('BlogCard', () => {
  it('渲染文章标题和摘要', () => {
    render(<BlogCard post={mockPost} />)
    expect(screen.getByText('Test Article Title')).toBeInTheDocument()
    expect(screen.getByText('This is a test excerpt for the blog card.')).toBeInTheDocument()
  })

  it('渲染分类标签', () => {
    render(<BlogCard post={mockPost} />)
    expect(screen.getByText('Tech')).toBeInTheDocument()
  })

  it('渲染日期', () => {
    render(<BlogCard post={mockPost} />)
    expect(screen.getByText('Oct 24, 2025')).toBeInTheDocument()
  })

  it('渲染作者头像', () => {
    render(<BlogCard post={mockPost} />)
    const avatar = screen.getByAltText('X')
    expect(avatar).toBeInTheDocument()
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.png')
  })

  it('渲染标签（最多 3 个）', () => {
    render(<BlogCard post={mockPost} />)
    expect(screen.getByText('#react')).toBeInTheDocument()
    expect(screen.getByText('#testing')).toBeInTheDocument()
    expect(screen.getByText('#vitest')).toBeInTheDocument()
  })

  it('showLikes 为 true 时显示点赞数', () => {
    render(<BlogCard post={mockPost} showLikes />)
    expect(screen.getByText('♥ 42')).toBeInTheDocument()
  })

  it('showLikes 默认不显示点赞数', () => {
    render(<BlogCard post={mockPost} />)
    expect(screen.queryByText('♥ 42')).not.toBeInTheDocument()
  })

  it('isActive 为 true 时添加 active 类名', () => {
    const { container } = render(<BlogCard post={mockPost} isActive />)
    expect(container.querySelector('.blog-card')).toHaveClass('active')
  })

  it('点击触发 onClick 回调', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<BlogCard post={mockPost} onClick={onClick} />)
    await user.click(screen.getByText('Test Article Title'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('无标签时不渲染标签区域', () => {
    const noTagsPost = { ...mockPost, tags: [] }
    const { container } = render(<BlogCard post={noTagsPost} />)
    expect(container.querySelector('.blog-card-tags')).not.toBeInTheDocument()
  })
})
