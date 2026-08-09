import { vi } from 'vitest'

vi.mock('lottie-react', () => ({
  default: (props: Record<string, unknown>) => {
    const { animationData: _ad, lottieRef: _ref, autoplay: _autoplay, ...rest } = props
    return <div data-testid="lottie-animation" {...rest} />
  },
}))
