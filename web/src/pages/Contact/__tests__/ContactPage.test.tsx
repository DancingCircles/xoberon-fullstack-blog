import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../test/test-utils'
import ContactPage from '../ContactPage'

import '../../../test/mocks/gsap'
import '../../../test/mocks/lottie'

vi.mock('lottie-react', () => ({
  default: (props: Record<string, unknown>) => {
    const { animationData: _ad, lottieRef: _lr, ...rest } = props
    return <div data-testid="lottie-animation" {...rest} />
  },
}))

vi.mock('../../../components/Contact/ContactModal', () => ({
  default: () => <div data-testid="contact-modal" />,
}))

vi.mock('../../../components/Contact/StudioShowcase', () => ({
  default: () => <div data-testid="studio-showcase" />,
}))

vi.mock('../../../assets/images/contact/steamboat-willie.json', () => ({ default: {} }))
vi.mock('../../../assets/images/contact/gibli-tribute.json', () => ({ default: {} }))

describe('ContactPage', () => {
  it('应该正常渲染', () => {
    renderWithProviders(<ContactPage />)
    expect(screen.getByText("LET'S")).toBeInTheDocument()
    expect(screen.getByText('TALK')).toBeInTheDocument()
  })

  it('应该展示技术清单', () => {
    renderWithProviders(<ContactPage />)
    expect(screen.getByText('LINEUP')).toBeInTheDocument()
    expect(screen.getByText('REACT')).toBeInTheDocument()
    expect(screen.getByText('GOLANG')).toBeInTheDocument()
  })

  it('应该展示联系按钮', () => {
    renderWithProviders(<ContactPage />)
    expect(screen.getByRole('button', { name: /contact/i })).toBeInTheDocument()
  })
})
