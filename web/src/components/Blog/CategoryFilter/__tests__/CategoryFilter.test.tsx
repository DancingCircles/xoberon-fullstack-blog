import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../../test/test-utils'
import CategoryFilter from '../CategoryFilter'

const defaultProps = {
  categories: ['Latest', 'Popular', 'Design', 'Tech'],
  activeCategory: 'Latest',
  onCategoryChange: vi.fn(),
  onSearch: vi.fn(),
  searchQuery: '',
  isSearchActive: false,
  onToggleSearch: vi.fn(),
}

describe('CategoryFilter', () => {
  it('应该渲染所有分类', () => {
    renderWithProviders(<CategoryFilter {...defaultProps} />)
    expect(screen.getByText('Latest')).toBeInTheDocument()
    expect(screen.getByText('Popular')).toBeInTheDocument()
    expect(screen.getByText('Design')).toBeInTheDocument()
    expect(screen.getByText('Tech')).toBeInTheDocument()
  })

  it('active 分类应该有 active class', () => {
    renderWithProviders(<CategoryFilter {...defaultProps} activeCategory="Design" />)
    const designBtn = screen.getByText('Design').closest('button')
    expect(designBtn?.className).toContain('active')
  })

  it('点击分类触发 onCategoryChange', async () => {
    const onCategoryChange = vi.fn()
    renderWithProviders(<CategoryFilter {...defaultProps} onCategoryChange={onCategoryChange} />)
    await userEvent.click(screen.getByText('Tech'))
    expect(onCategoryChange).toHaveBeenCalledWith('Tech')
  })

  it('点击搜索按钮触发 onToggleSearch', async () => {
    const onToggleSearch = vi.fn()
    renderWithProviders(<CategoryFilter {...defaultProps} onToggleSearch={onToggleSearch} />)
    await userEvent.click(screen.getByRole('button', { name: /open search/i }))
    expect(onToggleSearch).toHaveBeenCalled()
  })

  it('搜索模式展示搜索输入框', () => {
    renderWithProviders(<CategoryFilter {...defaultProps} isSearchActive={true} />)
    expect(screen.getByPlaceholderText('Search articles...')).toBeInTheDocument()
  })
})
