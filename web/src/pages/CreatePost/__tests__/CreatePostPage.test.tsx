import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../test/test-utils'
import CreatePostPage from '../CreatePostPage'

import '../../../test/mocks/react-markdown'

describe('CreatePostPage', () => {
  it('应该正常渲染', () => {
    renderWithProviders(<CreatePostPage />, {
      auth: {
        currentUser: { id: '1', name: 'X', handle: '@x', avatar: '', bio: '', role: 'user', postCount: 0, essayCount: 0 },
        isAuthenticated: true,
      },
    })
    expect(screen.getByText('NEW POST')).toBeInTheDocument()
  })

  it('应该展示表单元素', () => {
    renderWithProviders(<CreatePostPage />, {
      auth: {
        currentUser: { id: '1', name: 'X', handle: '@x', avatar: '', bio: '', role: 'user', postCount: 0, essayCount: 0 },
        isAuthenticated: true,
      },
    })
    expect(screen.getByText('TITLE')).toBeInTheDocument()
    expect(screen.getByText('CATEGORY')).toBeInTheDocument()
    expect(screen.getByText('CONTENT (MARKDOWN)')).toBeInTheDocument()
    expect(screen.getByText('PUBLISH POST')).toBeInTheDocument()
  })

  it('应该展示预览占位文本', () => {
    renderWithProviders(<CreatePostPage />, {
      auth: {
        currentUser: { id: '1', name: 'X', handle: '@x', avatar: '', bio: '', role: 'user', postCount: 0, essayCount: 0 },
        isAuthenticated: true,
      },
    })
    expect(screen.getByText('Preview will appear here...')).toBeInTheDocument()
  })
})
