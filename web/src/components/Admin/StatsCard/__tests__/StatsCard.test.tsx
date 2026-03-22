import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../test/test-utils'
import StatsCard from '../StatsCard'

describe('StatsCard', () => {
  it('应该渲染标签和数值', () => {
    renderWithProviders(
      <StatsCard icon={<span>icon</span>} label="用户数" value={42} />
    )
    expect(screen.getByText('用户数')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('应该渲染趋势文本', () => {
    renderWithProviders(
      <StatsCard icon={<span>icon</span>} label="在线" value={7} trend="实时" />
    )
    expect(screen.getByText('实时')).toBeInTheDocument()
  })

  it('无趋势时不渲染趋势元素', () => {
    const { container } = renderWithProviders(
      <StatsCard icon={<span>icon</span>} label="总数" value={100} />
    )
    expect(container.querySelector('.stats-card__trend')).not.toBeInTheDocument()
  })
})
