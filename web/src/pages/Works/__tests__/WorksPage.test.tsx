import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../test/test-utils'
import WorksPage from '../WorksPage'

import '../../../test/mocks/gsap'

vi.mock('../../../components/Common/AnimatedTitle', () => ({
  default: ({ text }: { text: string }) => <span>{text}</span>,
}))

vi.mock('../../../components/Common/Watermark', () => ({
  default: () => <div data-testid="watermark" />,
}))

describe('WorksPage', () => {
  it('应该正常渲染', () => {
    renderWithProviders(<WorksPage />)
    expect(screen.getByText('SEARCH')).toBeInTheDocument()
    expect(screen.getByText('INSIGHTS')).toBeInTheDocument()
  })

  it('应该展示搜索框', () => {
    renderWithProviders(<WorksPage />)
    expect(screen.getByPlaceholderText('搜索帖子、随笔...')).toBeInTheDocument()
  })
})
