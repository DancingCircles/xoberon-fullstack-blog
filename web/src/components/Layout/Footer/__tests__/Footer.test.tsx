import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../test/test-utils'
import Footer from '../Footer'

import '../../../../test/mocks/gsap'

vi.mock('../../../Contact/ContactModal', () => ({
  default: () => <div data-testid="contact-modal" />,
}))

describe('Footer', () => {
  it('应该正常渲染', () => {
    renderWithProviders(<Footer />)
    expect(screen.getByText(/REACH/)).toBeInTheDocument()
  })

  it('应该展示署名', () => {
    renderWithProviders(<Footer />)
    expect(screen.getByText(/DESIGNED & BUILT BY XOBERON/)).toBeInTheDocument()
  })

  it('应该展示联系按钮', () => {
    renderWithProviders(<Footer />)
    expect(screen.getByRole('button', { name: /contact/i })).toBeInTheDocument()
  })
})
