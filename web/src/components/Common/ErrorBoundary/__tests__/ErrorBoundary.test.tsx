import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../../test/test-utils'
import ErrorBoundary from '../ErrorBoundary'

function ThrowError() {
  throw new Error('Test error')
  return null
}

describe('ErrorBoundary', () => {
  it('正常渲染子组件', () => {
    renderWithProviders(
      <ErrorBoundary>
        <div>child content</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('child content')).toBeInTheDocument()
  })

  it('捕获错误并展示默认 fallback', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    renderWithProviders(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Try Again')).toBeInTheDocument()
    consoleSpy.mockRestore()
  })

  it('捕获错误并展示自定义 fallback', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    renderWithProviders(
      <ErrorBoundary fallback={<div>custom error</div>}>
        <ThrowError />
      </ErrorBoundary>
    )
    expect(screen.getByText('custom error')).toBeInTheDocument()
    consoleSpy.mockRestore()
  })

  it('点击 Try Again 恢复正常', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    let shouldThrow = true
    function MaybeThrow() {
      if (shouldThrow) throw new Error('fail')
      return <div>recovered</div>
    }

    renderWithProviders(
      <ErrorBoundary>
        <MaybeThrow />
      </ErrorBoundary>
    )
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    shouldThrow = false
    await userEvent.click(screen.getByText('Try Again'))
    expect(screen.getByText('recovered')).toBeInTheDocument()
    consoleSpy.mockRestore()
  })
})
