import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import type { BlogPost, Comment } from '../../../assets/data/mockData'
import { useBodyScrollLock } from '../../../hooks/scroll/useBodyScrollLock'
import { useWheelScroll } from '../../../hooks/scroll/useWheelScroll'
import { useAuth } from '../../../hooks/auth/useAuth'
import { useData } from '../../../hooks/auth/useData'
import { useToast } from '../../../hooks/social/useToast'
import { fetchComments, createComment, deleteComment, deletePost, recordView } from '../../../services/mockRuntime'
import { friendlyErrorMessage } from '../../../services/api'
import MarkdownRenderer from '../../Common/MarkdownRenderer'
import RelatedPosts from '../RelatedPosts'
import LikeButton from '../../Common/LikeButton'
import './BlogModal.css'

interface BlogModalProps {
  post: BlogPost | null
  isOpen: boolean
  onClose: () => void
  onPostClick?: (post: BlogPost) => void
}

export default function BlogModal({ post, isOpen, onClose, onPostClick }: BlogModalProps) {
  const navigate = useNavigate()
  const { currentUser, requireAuth } = useAuth()
  const { removePost } = useData()
  const { toast } = useToast()
  const isOwnPost = currentUser !== null && post !== null && post.author.handle === currentUser.handle
  const overlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const postContentRef = useRef<HTMLDivElement>(null)
  const commentsListRef = useRef<HTMLDivElement>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [comments, setComments] = useState<Comment[]>([])
  const [loadingComments, setLoadingComments] = useState(true)
  const [commentsExpanded, setCommentsExpanded] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const mouseDownTargetRef = useRef<EventTarget | null>(null)

  useEffect(() => {
    if (!isOpen || !post) return
    let cancelled = false
    fetchComments(post.id)
      .then(data => { if (!cancelled) setComments(data) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingComments(false) })
    if (currentUser) {
      recordView(post.id).catch(() => {})
    }
    return () => {
      cancelled = true
      setComments([])
      setLoadingComments(true)
    }
  }, [isOpen, post, currentUser])

  // Lock body scroll when modal is open
  useBodyScrollLock(isOpen && !!post)

  // Handle wheel scroll for post content and comments
  useWheelScroll(postContentRef, isOpen && !!post)
  useWheelScroll(commentsListRef, isOpen && !!post)

  // Close with animation - defined before effects that use it
  const handleClose = useCallback(() => {
    const tl = gsap.timeline({
      onComplete: onClose
    })

    tl.to(contentRef.current, {
      opacity: 0,
      scale: 0.9,
      y: 20,
      duration: 0.3,
      ease: 'power2.in'
    })
    .to(overlayRef.current, {
      opacity: 0,
      duration: 0.2
    }, '-=0.1')
  }, [onClose])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setLinkCopied(true)
      timerRef.current = setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      // Fallback: silently fail if clipboard API is not available
    }
  }

  const handleAuthorClick = () => {
    if (!post) return
    const authorHandle = post.author.handle.replace('@', '')
    handleClose()
    timerRef.current = setTimeout(() => {
      navigate(`/author/${authorHandle}`)
    }, 350)
  }

  useEffect(() => {
    return () => clearTimeout(timerRef.current)
  }, [])

  // Open animation
  useEffect(() => {
    if (isOpen && post) {
      const tl = gsap.timeline()
      
      gsap.set(overlayRef.current, { opacity: 0 })
      gsap.set(contentRef.current, { 
        opacity: 0,
        scale: 0.9,
        y: 20
      })

      tl.to(overlayRef.current, {
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out'
      })
      .to(contentRef.current, {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.4,
        ease: 'back.out(1.2)'
      }, '-=0.1')
      
      if (postContentRef.current) {
        postContentRef.current.scrollTop = 0
      }

      return () => { tl.kill() }
    }
  }, [isOpen, post])

  // ESC key to close
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleClose])

  // Handle related post click
  const handleRelatedClick = (newPost: BlogPost) => {
    if (onPostClick) {
      onPostClick(newPost)
    }
  }

  if (!post) return null

  return createPortal(
    <div
      className="blog-modal-overlay"
      ref={overlayRef}
      onMouseDown={e => { mouseDownTargetRef.current = e.target }}
      onClick={e => { if (e.target === overlayRef.current && mouseDownTargetRef.current === overlayRef.current) handleClose() }}
      role="dialog"
      aria-modal="true"
      aria-label={post.title}
    >
      <div 
        className="blog-modal-container" 
        ref={contentRef} 
        onClick={e => e.stopPropagation()}
      >
        <button className="blog-modal-close" onClick={handleClose} aria-label="Close modal">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {isOwnPost && (
          <button
            className="modal-delete-btn"
            title="删除帖子"
            aria-label="删除帖子"
            onClick={() => {
              if (!post) return
              toast.warning('确定删除此文章吗？', {
                label: '确认删除',
                onClick: async () => {
                  try {
                    await deletePost(post.id)
                    removePost(post.id)
                    toast.success('帖子已删除')
                    handleClose()
                  } catch (err) {
                    toast.error(friendlyErrorMessage(err, '删除帖子失败'))
                  }
                }
              })
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        <div className="blog-modal-content-wrapper">
          {/* Left Side: Post Details */}
          <div className="blog-modal-post" ref={postContentRef}>
            <div className="blog-modal-header">
              <span className="blog-modal-category">{post.category}</span>
              <div className="blog-modal-meta">
                <span>{post.date}</span>
              </div>
            </div>

            <h2 className="blog-modal-title">{post.title}</h2>

            <div className="blog-modal-topbar">
              <img 
                src={post.author.avatar} 
                alt={post.author.name} 
                className="author-avatar author-avatar--clickable" 
                onClick={handleAuthorClick}
                title={`查看 ${post.author.name} 的主页`}
              />
              <button 
                className="copy-link-btn" 
                onClick={handleCopyLink}
                title="复制链接"
                aria-label="复制链接"
              >
                {linkCopied ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 13C10.4292 13.5742 10.9796 14.0492 11.6096 14.3887C12.2396 14.7282 12.9328 14.9234 13.6364 14.9596C14.3399 14.9959 15.0357 14.8722 15.6705 14.5981C16.3053 14.324 16.8624 13.9068 17.2991 13.3788C17.7358 12.8507 18.0406 12.226 18.1901 11.5526C18.3396 10.8791 18.3297 10.1748 18.1611 9.4934C17.9926 8.812 17.67 8.17135 17.2177 7.62024C16.7654 7.06913 16.1952 6.62194 15.5505 6.31299" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 11C13.5708 10.4258 13.0204 9.95083 12.3904 9.61132C11.7604 9.27181 11.0672 9.07659 10.3636 9.04037C9.66005 9.00414 8.96434 9.12788 8.32953 9.40194C7.69472 9.67599 7.1376 10.0932 6.70092 10.6212C6.26424 11.1493 5.95941 11.774 5.80993 12.4475C5.66044 13.1209 5.6703 13.8252 5.83887 14.5066C6.00743 15.188 6.33003 15.8287 6.78233 16.3798C7.23463 16.9309 7.80481 17.3781 8.44951 17.687" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
              <div className="blog-modal-topbar-right">
                <LikeButton type="post" itemId={post.id} initialLikes={post.likes} />
              </div>
            </div>

            <div className="blog-modal-body">
              <MarkdownRenderer content={post.content} />
            </div>

            <div className="blog-modal-footer-content">
              {post.tags && post.tags.length > 0 && (
                <div className="blog-tags">
                  {post.tags.map(tag => (
                    <span key={tag} className="blog-tag">#{tag}</span>
                  ))}
                </div>
              )}

              {onPostClick && (
                <RelatedPosts 
                  currentPost={post} 
                  onPostClick={handleRelatedClick} 
                />
              )}
            </div>

          </div>

          {/* Right Side: Comments */}
          <div className={`blog-modal-comments ${commentsExpanded ? 'blog-modal-comments--expanded' : ''}`}>
            <button
              className="comments-toggle"
              onClick={() => setCommentsExpanded(prev => !prev)}
              aria-expanded={commentsExpanded}
            >
              <h3 className="comments-title">
                COMMENTS <span className="comments-count">({comments.length})</span>
              </h3>
              <svg className="comments-toggle-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <div className="comments-list" ref={commentsListRef}>
              {loadingComments ? (
                <div className="no-comments"><p>加载评论中…</p></div>
              ) : comments.length > 0 ? (
                comments.map(comment => {
                  const commentAuthorId = comment.author.toLowerCase().split(' ')[0]
                  const handleCommentAuthorClick = () => {
                    handleClose()
                    timerRef.current = setTimeout(() => {
                      navigate(`/author/${commentAuthorId}`)
                    }, 350)
                  }
                  const isOwnComment = currentUser?.id === comment.authorId
                  const handleDeleteComment = () => {
                    if (!post) return
                    toast.warning('确定删除此评论吗？', {
                      label: '确认删除',
                      onClick: async () => {
                        try {
                          await deleteComment(post.id, comment.id)
                          setComments(prev => prev.filter(c => c.id !== comment.id))
                          toast.success('评论已删除')
                        } catch (err) {
                          toast.error(friendlyErrorMessage(err, '删除评论失败'))
                        }
                      }
                    })
                  }
                  return (
                  <div key={comment.id} className="comment-item">
                    <img 
                      src={comment.avatar} 
                      alt={comment.author} 
                      className="comment-avatar comment-avatar--clickable" 
                      onClick={handleCommentAuthorClick}
                      title={`查看 ${comment.author} 的主页`}
                    />
                    <div className="comment-content">
                      <div className="comment-header">
                        <span 
                          className="comment-author comment-author--clickable" 
                          onClick={handleCommentAuthorClick}
                        >
                          {comment.author}
                        </span>
                        <span className="comment-date">{comment.date}</span>
                      </div>
                      <div className="comment-text-row">
                        <p className="comment-text">{comment.content}</p>
                        {isOwnComment && (
                          <button className="comment-delete-btn" onClick={handleDeleteComment} title="删除评论" aria-label="删除评论">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )})
              ) : (
                <div className="no-comments">
                  <p>No comments yet. Be the first to share your thoughts!</p>
                </div>
              )}
            </div>

            <div className="comment-input-area">
              <textarea
                placeholder="Write a comment..."
                rows={3}
                className="comment-textarea"
                value={commentText}
                maxLength={300}
                onChange={e => setCommentText(e.target.value.slice(0, 300))}
              />
              <span className={`comment-char-count${commentText.length >= 300 ? ' comment-char-count--limit' : ''}`}>
                {commentText.length}/300
              </span>
              <button
                className="comment-submit-btn"
                onClick={async () => {
                  if (!requireAuth()) return
                  if (!commentText.trim() || !post || !currentUser) return
                  try {
                    const newComment = await createComment(post.id, commentText.trim())
                    setComments(prev => [...prev, newComment])
                    setCommentText('')
                  } catch { /* toast handled by provider */ }
                }}
              >
                POST
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
