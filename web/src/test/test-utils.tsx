import { render, type RenderOptions } from '@testing-library/react'
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom'
import { LikesProvider } from '../contexts/likes/LikesProvider'
import { ToastContext } from '../contexts/toast/ToastContext'
import { AuthContext, type AuthContextType } from '../contexts/auth/AuthContext'
import { DataContext, type DataContextType } from '../contexts/data/DataContext'
import { LenisContext } from '../contexts/lenis/LenisContext'
import { vi } from 'vitest'
import type { ReactNode } from 'react'

// Stubbed toast — captures calls without side effects
function createMockToast() {
  return {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }
}

const defaultAuth: AuthContextType = {
  currentUser: null,
  isAuthenticated: false,
  isLoading: false,
  isAdmin: false,
  isOwner: false,
  login: vi.fn(() => Promise.resolve({ ok: false, message: '未实现' })),
  register: vi.fn(() => Promise.resolve({ ok: false, message: '未实现' })),
  logout: vi.fn(() => Promise.resolve()),
  updateProfile: vi.fn(() => Promise.resolve()),
  requireAuth: vi.fn(() => true),
}

const defaultData: DataContextType = {
  posts: [],
  essays: [],
  isLoading: false,
  error: null,
  addPost: vi.fn() as unknown as DataContextType['addPost'],
  addEssay: vi.fn() as unknown as DataContextType['addEssay'],
  addComment: vi.fn() as unknown as DataContextType['addComment'],
  removePost: vi.fn(),
  removeEssay: vi.fn(),
  refreshPosts: vi.fn() as unknown as DataContextType['refreshPosts'],
  refreshEssays: vi.fn() as unknown as DataContextType['refreshEssays'],
}

interface WrapperOptions {
  auth?: Partial<AuthContextType>
  data?: Partial<DataContextType>
  routerProps?: MemoryRouterProps
  withLikes?: boolean
}

function createWrapper(opts: WrapperOptions = {}) {
  const mockToast = createMockToast()
  const auth = { ...defaultAuth, ...opts.auth }
  const data = { ...defaultData, ...opts.data }
  const routerProps = opts.routerProps ?? { initialEntries: ['/'] }

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <LenisContext.Provider value={{ lenis: null }}>
        <LikesProvider>
          <ToastContext.Provider value={{ toast: mockToast }}>
            <MemoryRouter {...routerProps}>
              <AuthContext.Provider value={auth}>
                <DataContext.Provider value={data}>
                  {children}
                </DataContext.Provider>
              </AuthContext.Provider>
            </MemoryRouter>
          </ToastContext.Provider>
        </LikesProvider>
      </LenisContext.Provider>
    )
  }

  return { Wrapper, mockToast, auth, data }
}

export function renderWithProviders(
  ui: React.ReactElement,
  opts: WrapperOptions & Omit<RenderOptions, 'wrapper'> = {},
) {
  const { auth, data, routerProps, withLikes, ...renderOpts } = opts
  const { Wrapper, mockToast, auth: resolvedAuth, data: resolvedData } = createWrapper({
    auth,
    data,
    routerProps,
    withLikes,
  })

  const result = render(ui, { wrapper: Wrapper, ...renderOpts })
  return {
    ...result,
    mockToast,
    auth: resolvedAuth,
    data: resolvedData,
  }
}

export { createMockToast }
export { render } from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
export { screen, within, waitFor, act } from '@testing-library/react'
