import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders, userEvent } from '../../../../test/test-utils'
import LikeButton from '../LikeButton'

import '../../../../test/mocks/gsap'

vi.mock('../../../../services/mockRuntime', () => ({
  togglePostLike: vi.fn(() => Promise.resolve({ liked: true, likeCount: 1 })),
  toggleEssayLike: vi.fn(() => Promise.resolve({ liked: true, likeCount: 1 })),
}))

import { togglePostLike as apiTogglePostLike, toggleEssayLike as apiToggleEssayLike } from '../../../../services/mockRuntime'

describe('LikeButton', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(apiTogglePostLike).mockResolvedValue({ liked: true, likeCount: 1 })
    vi.mocked(apiToggleEssayLike).mockResolvedValue({ liked: true, likeCount: 1 })
  })

  it('显示初始点赞数', () => {
    renderWithProviders(<LikeButton type="post" itemId="p1" initialLikes={10} />)
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('未点赞时 aria-label 为 "Like"', () => {
    renderWithProviders(<LikeButton type="post" itemId="p1" />)
    expect(screen.getByLabelText('Like')).toBeInTheDocument()
  })

  it('点击后切换点赞状态', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LikeButton type="post" itemId="p1" initialLikes={10} />)
    await user.click(screen.getByLabelText('Like'))
    await waitFor(() => {
      expect(screen.getByLabelText('Unlike')).toBeInTheDocument()
    })
    expect(screen.getByText('11')).toBeInTheDocument()
  })

  it('再次点击取消点赞', async () => {
    vi.mocked(apiTogglePostLike)
      .mockResolvedValueOnce({ liked: true, likeCount: 11 })
      .mockResolvedValueOnce({ liked: false, likeCount: 10 })
    const user = userEvent.setup()
    renderWithProviders(<LikeButton type="post" itemId="p1" initialLikes={10} />)
    await user.click(screen.getByLabelText('Like'))
    await waitFor(() => expect(screen.getByText('11')).toBeInTheDocument())
    await user.click(screen.getByLabelText('Unlike'))
    await waitFor(() => expect(screen.getByText('10')).toBeInTheDocument())
  })

  it('essay 类型同样工作', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LikeButton type="essay" itemId="e1" initialLikes={5} />)
    await user.click(screen.getByLabelText('Like'))
    await waitFor(() => {
      expect(screen.getByText('6')).toBeInTheDocument()
    })
  })

  it('未认证时 requireAuth 被调用', async () => {
    const user = userEvent.setup()
    const requireAuth = vi.fn(() => false)
    renderWithProviders(
      <LikeButton type="post" itemId="p1" initialLikes={0} />,
      { auth: { requireAuth } },
    )
    await user.click(screen.getByLabelText('Like'))
    expect(requireAuth).toHaveBeenCalled()
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})
