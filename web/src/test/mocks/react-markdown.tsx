import { vi } from 'vitest'

vi.mock('react-markdown', () => ({
  default: ({ children }: { children?: unknown }) => {
    const raw = Array.isArray(children) ? children.join('') : String(children ?? '')
    const text = raw
      .split('\n')
      .map(line => line.replace(/^#{1,6}\s+/, ''))
      .join('\n')
    return <div data-testid="markdown-content">{text}</div>
  },
}))

vi.mock('remark-gfm', () => ({
  default: vi.fn(),
}))

vi.mock('remark-breaks', () => ({
  default: vi.fn(),
}))

vi.mock('react-syntax-highlighter', () => ({
  Prism: ({ children }: { children?: string }) => (
    <pre data-testid="syntax-highlighter">{children}</pre>
  ),
}))

vi.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  vscDarkPlus: {},
}))
