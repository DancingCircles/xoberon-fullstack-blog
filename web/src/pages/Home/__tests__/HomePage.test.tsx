import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../test/test-utils'
import HomePage from '../HomePage'

import '../../../test/mocks/gsap'
import '../../../test/mocks/lenis'
import '../../../test/mocks/three'

vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: {
    create: vi.fn(),
    update: vi.fn(),
    refresh: vi.fn(),
    sort: vi.fn(),
    getAll: vi.fn(() => []),
    killAll: vi.fn(),
  },
}))

beforeAll(() => {
  Object.defineProperty(document, 'fonts', {
    value: { ready: Promise.resolve() },
    writable: true,
  })
})

vi.mock('../../../components/3D/CupheadModel', () => ({
  default: () => <div data-testid="cuphead-model">3D Model</div>,
}))

vi.mock('../../../components/Common/AnimatedTitle', () => ({
  default: ({ text }: { text: string }) => <span>{text}</span>,
}))

describe('HomePage', () => {
  it('应该正常渲染', () => {
    renderWithProviders(<HomePage />)
    expect(screen.getByText('Studio')).toBeInTheDocument()
  })

  it('应该展示 3D 模型', () => {
    renderWithProviders(<HomePage />)
    expect(screen.getByTestId('cuphead-model')).toBeInTheDocument()
  })

  it('应该展示 WORKS 按钮', () => {
    renderWithProviders(<HomePage />)
    expect(screen.getByText('WORKS')).toBeInTheDocument()
  })

  it('应该展示流程步骤', () => {
    renderWithProviders(<HomePage />)
    expect(screen.getByText('EXPLORE')).toBeInTheDocument()
    expect(screen.getByText('DESIGN')).toBeInTheDocument()
    expect(screen.getByText('DEVELOP')).toBeInTheDocument()
    expect(screen.getByText('DELIVER')).toBeInTheDocument()
  })

  it('应该展示 CTA 区域', () => {
    renderWithProviders(<HomePage />)
    expect(screen.getByText('EXPLORE POSTS')).toBeInTheDocument()
  })
})
