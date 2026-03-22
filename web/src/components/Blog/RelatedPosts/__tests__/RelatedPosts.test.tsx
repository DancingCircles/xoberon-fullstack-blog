import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../test/test-utils'
import RelatedPosts from '../RelatedPosts'
import type { BlogPost } from '../../../../assets/data/mockData'

const currentPost: BlogPost = {
  id: 'p1',
  title: 'Current Post',
  slug: 'current-post',
  excerpt: 'excerpt',
  content: 'content',
  category: 'Tech',
  tags: [],
  date: 'Mar 1, 2026',
  readTime: 5,
  likes: 10,
  author: { name: 'X', avatar: '/av.png', handle: '@x' },
  comments: [],
}

const relatedPost: BlogPost = {
  id: 'p2',
  title: 'Related Post',
  slug: 'related-post',
  excerpt: 'excerpt2',
  content: 'content2',
  category: 'Tech',
  tags: [],
  date: 'Mar 2, 2026',
  readTime: 3,
  likes: 5,
  author: { name: 'X', avatar: '/av.png', handle: '@x' },
  comments: [],
}

describe('RelatedPosts', () => {
  it('无相关文章时不渲染', () => {
    const { container } = renderWithProviders(
      <RelatedPosts currentPost={currentPost} onPostClick={vi.fn()} />,
      { data: { posts: [currentPost] } }
    )
    expect(container.querySelector('.related-posts')).not.toBeInTheDocument()
  })

  it('有相关文章时渲染', () => {
    renderWithProviders(
      <RelatedPosts currentPost={currentPost} onPostClick={vi.fn()} />,
      { data: { posts: [currentPost, relatedPost] } }
    )
    expect(screen.getByText('READ NEXT')).toBeInTheDocument()
    expect(screen.getByText('Related Post')).toBeInTheDocument()
  })

  it('点击相关文章触发 onPostClick', async () => {
    const onPostClick = vi.fn()
    renderWithProviders(
      <RelatedPosts currentPost={currentPost} onPostClick={onPostClick} />,
      { data: { posts: [currentPost, relatedPost] } }
    )
    const { default: userEvent } = await import('@testing-library/user-event')
    await userEvent.click(screen.getByText('Related Post'))
    expect(onPostClick).toHaveBeenCalledWith(relatedPost)
  })
})
