import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          padding: '2rem',
          textAlign: 'center',
          fontFamily: 'var(--font-body, sans-serif)',
          color: 'var(--color-text, #f3ead7)',
        }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Something went wrong</h2>
          <p style={{ 
            fontSize: '1.1rem', 
            opacity: 0.7, 
            maxWidth: '500px',
            marginBottom: '2rem'
          }}>
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '12px 24px',
              fontSize: '1rem',
              fontFamily: 'var(--font-display, sans-serif)',
              textTransform: 'uppercase',
              border: '2px solid var(--color-cream, #f3ead7)',
              background: 'transparent',
              color: 'var(--color-cream, #f3ead7)',
              borderRadius: '8px',
              cursor: 'pointer',
              letterSpacing: '0.05em',
            }}
          >
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
