import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../../test/test-utils'
import BlogModal from '../BlogModal'
import type { BlogPost } from '../../../../assets/data/mockData'

import '../../../../test/mocks/gsap'
import '../../../../test/mocks/react-markdown'

vi.mock('../../../../services/mockRuntime', () => ({
  fetchComments: vi.fn(() => Promise.resolve([])),
  createComment: vi.fn(),
  recordView: vi.fn(() => Promise.resolve()),
}))

vi.mock('../../Common/LikeButton', () => ({
  default: () => <button data-testid="like-button">Like</button>,
}))

vi.mock('../RelatedPosts', () => ({
  default: () => <div data-testid="related-posts" />,
}))

const mockPost: BlogPost = {
  id: 'p1',
  title: 'Test Blog Post',
  slug: 'test-blog-post',
  excerpt: 'Test excerpt',
  content: '## Hello\nThis is content',
  category: 'Tech',
  tags: ['react', 'testing'],
  date: 'Mar 1, 2026',
  readTime: 5,
  likes: 10,
  author: { name: 'X', avatar: '/avatar.png', handle: '@x' },
  comments: [],
}

describe('BlogModal', () => {
  it('post 为 null 时不渲染', () => {
    renderWithProviders(<BlogModal post={null} isOpen={false} onClose={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('isOpen=true 且 post 存在时渲染', async () => {
    renderWithProviders(<BlogModal post={mockPost} isOpen={true} onClose={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Test Blog Post')).toBeInTheDocument()
    })
  })

  it('ESC 键触发关闭', async () => {
    const onClose = vi.fn()
    renderWithProviders(<BlogModal post={mockPost} isOpen={true} onClose={onClose} />)
    await userEvent.keyboard('{Escape}')
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('应该展示关闭按钮', async () => {
    renderWithProviders(<BlogModal post={mockPost} isOpen={true} onClose={vi.fn()} />)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
    )
  })

  it('应该展示标签', async () => {
    renderWithProviders(<BlogModal post={mockPost} isOpen={true} onClose={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('#react')).toBeInTheDocument()
      expect(screen.getByText('#testing')).toBeInTheDocument()
    })
  })
})
