import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import './MarkdownRenderer.css'

interface MarkdownRendererProps {
  content: string
  preserveLineBreaks?: boolean
}

export default function MarkdownRenderer({ content, preserveLineBreaks = false }: MarkdownRendererProps) {
  const plugins = useMemo(
    () => preserveLineBreaks ? [remarkGfm, remarkBreaks] : [remarkGfm],
    [preserveLineBreaks]
  )

  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={plugins}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const isInline = !match
            return !isInline && match ? (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            )
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
