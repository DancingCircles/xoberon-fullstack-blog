import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../test/test-utils'
import AboutPage from '../AboutPage'

import '../../../test/mocks/gsap'

vi.mock('../../../components/Common/EssayModal', () => ({
  default: () => <div data-testid="essay-modal" />,
}))

vi.mock('../../../components/Common/CreateEssayModal', () => ({
  default: () => <div data-testid="create-essay-modal" />,
}))

describe('AboutPage', () => {
  it('应该正常渲染', () => {
    renderWithProviders(<AboutPage />)
    expect(screen.getByText(/We don't/)).toBeInTheDocument()
  })

  it('应该展示标题内容', () => {
    renderWithProviders(<AboutPage />)
    expect(screen.getByText('just think.')).toBeInTheDocument()
  })

  it('essays 为空时展示空状态', () => {
    renderWithProviders(<AboutPage />, { data: { essays: [] } })
    expect(screen.getByText('No essays found')).toBeInTheDocument()
  })
})
