import { vi } from 'vitest'

vi.mock('lottie-react', () => ({
  default: (props: Record<string, unknown>) => {
    const { animationData: _ad, ...rest } = props
    return <div data-testid="lottie-animation" {...rest} />
  },
}))
