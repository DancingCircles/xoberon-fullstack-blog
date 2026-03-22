import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import type { BlogPost, EssayItem, UserProfile } from '../../assets/data/mockData'
import { useData } from '../../hooks/auth/useData'
import { useAuth } from '../../hooks/auth/useAuth'
import { useToast } from '../../hooks/social/useToast'
import { formatDate } from '../../utils/dateUtils'
import { useLikes } from '../../hooks/social/useLikes'
import BlogModal from '../../components/Blog/BlogModal'
import EssayModal from '../../components/Common/EssayModal'
import { fetchUserProfile, deletePost, deleteEssay } from '../../services/mockRuntime'
import { friendlyErrorMessage } from '../../services/api'
import './AuthorPage.css'

type AuthorTab = 'posts' | 'essays' | 'liked-posts' | 'liked-essays'
type SortKey = 'category' | 'date' | 'likes' | null
type SortDir = 'asc' | 'desc'

export default function AuthorPage() {
  const { authorId } = useParams<{ authorId: string }>()
  const navigate = useNavigate()
  const { likedPostIds, likedEssayIds } = useLikes()
  const { posts: blogPosts, essays, removePost, removeEssay } = useData()
  const { currentUser } = useAuth()
  const { toast } = useToast()

  const [fetchedUser, setFetchedUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    const loadProfile = async () => {
      if (!authorId) {
        if (!cancelled) {
          setFetchedUser(null)
          setIsLoading(false)
        }
        return
      }
      try {
        const user = await fetchUserProfile(authorId)
        if (!cancelled) {
          setFetchedUser(user)
        }
      } catch {
        if (!cancelled) {
          setFetchedUser(null)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }
    loadProfile()

    return () => { cancelled = true }
  }, [authorId])

  const user = useMemo(() => {
    if (currentUser && currentUser.handle.replace('@', '') === authorId) return currentUser
    return fetchedUser
  }, [currentUser, authorId, fetchedUser])

  const isOwnProfile = currentUser !== null && user !== null && user.id === currentUser.id

  const userPosts = useMemo(() => {
    if (!user) return []
    return blogPosts.filter(p => p.author.handle === user.handle)
  }, [user, blogPosts])

  const userEssays = useMemo(() => {
    if (!user) return []
    return essays.filter(e => e.author.handle === user.handle)
  }, [user, essays])

  const likedPosts = useMemo(() => {
    if (!isOwnProfile) return []
    return blogPosts.filter(p => likedPostIds.has(p.id))
  }, [isOwnProfile, likedPostIds, blogPosts])

  const likedEssays = useMemo(() => {
    if (!isOwnProfile) return []
    return essays.filter(e => likedEssayIds.has(e.id))
  }, [isOwnProfile, likedEssayIds, essays])

  const [activeTab, setActiveTab] = useState<AuthorTab>('posts')
  const [sortKey, setSortKey] = useState<SortKey>(null)
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null)
  const [selectedEssay, setSelectedEssay] = useState<EssayItem | null>(null)
  const [isEssayModalOpen, setIsEssayModalOpen] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }, [sortKey])

  const sortPosts = useCallback((items: BlogPost[]): BlogPost[] => {
    if (!sortKey) return items
    const sorted = [...items]
    const dir = sortDir === 'asc' ? 1 : -1
    sorted.sort((a, b) => {
      if (sortKey === 'category') return a.category.localeCompare(b.category) * dir
      if (sortKey === 'date') return (new Date(a.date).getTime() - new Date(b.date).getTime()) * dir
      if (sortKey === 'likes') return (a.likes - b.likes) * dir
      return 0
    })
    return sorted
  }, [sortKey, sortDir])

  const sortEssayItems = useCallback((items: EssayItem[]): EssayItem[] => {
    if (!sortKey) return items
    const sorted = [...items]
    const dir = sortDir === 'asc' ? 1 : -1
    sorted.sort((a, b) => {
      if (sortKey === 'date') return (new Date(a.date).getTime() - new Date(b.date).getTime()) * dir
      if (sortKey === 'likes') return (a.likes - b.likes) * dir
      return 0
    })
    return sorted
  }, [sortKey, sortDir])

  const sortedPosts = useMemo(() => sortPosts(userPosts), [sortPosts, userPosts])
  const sortedEssays = useMemo(() => sortEssayItems(userEssays), [sortEssayItems, userEssays])
  const sortedLikedPosts = useMemo(() => sortPosts(likedPosts), [sortPosts, likedPosts])
  const sortedLikedEssays = useMemo(() => sortEssayItems(likedEssays), [sortEssayItems, likedEssays])

  const currentResults = useMemo(() => {
    if (activeTab === 'posts') return sortedPosts
    if (activeTab === 'essays') return sortedEssays
    if (activeTab === 'liked-posts') return sortedLikedPosts
    return sortedLikedEssays
  }, [activeTab, sortedPosts, sortedEssays, sortedLikedPosts, sortedLikedEssays])

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const rows = list.querySelectorAll('.sr-row')
    if (rows.length === 0) return

    const tw = gsap.fromTo(rows,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.35, stagger: 0.04, ease: 'power2.out' }
    )
    return () => { tw.kill() }
  }, [activeTab, currentResults])

  const handleBack = useCallback(() => {
    navigate(-1)
  }, [navigate])

  const handleCloseEssay = useCallback(() => {
    setIsEssayModalOpen(false)
    closeTimerRef.current = setTimeout(() => setSelectedEssay(null), 300)
  }, [])

  useEffect(() => {
    return () => clearTimeout(closeTimerRef.current)
  }, [])

  const switchTab = useCallback((tab: AuthorTab) => {
    setActiveTab(tab)
    setSortKey(null)
  }, [])

  const isPostTab = activeTab === 'posts' || activeTab === 'liked-posts'
  const isEssayTab = activeTab === 'essays' || activeTab === 'liked-essays'

  const emptyMessage = useMemo(() => {
    const labels: Record<AuthorTab, string> = {
      'posts': '帖子',
      'essays': '随笔',
      'liked-posts': '喜欢的帖子',
      'liked-essays': '喜欢的随笔',
    }
    return labels[activeTab]
  }, [activeTab])

  if (isLoading) {
    return (
      <div className="page page--author">
        <div className="ap-container">
          <header className="ap-header">
            <div className="ap-not-found">
              <p>正在加载用户数据...</p>
            </div>
          </header>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="page page--author">
        <div className="ap-container">
          <header className="ap-header">
            <button className="sr-back" onClick={handleBack}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="ap-not-found">
              <h1>User not found</h1>
              <p>该用户不存在</p>
            </div>
          </header>
        </div>
      </div>
    )
  }

  return (
    <div className="page page--author">
      <div className="ap-container">
        {/* Profile header */}
        <header className="ap-header">
          {!isOwnProfile && (
            <button className="sr-back" onClick={handleBack}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div className="ap-profile">
            <img className="ap-avatar" src={user.avatar} alt={user.name} />
            <div className="ap-info">
              <h1 className="ap-name">{user.name}</h1>
              <span className="ap-handle">{user.handle}</span>
              <p className="ap-bio">{user.bio}</p>
            </div>
          </div>
        </header>

        {/* Stats */}
        <div className="ap-stats">
          <div className="ap-stat">
            <span className="ap-stat-num">{userPosts.length}</span>
            <span className="ap-stat-label">Posts</span>
          </div>
          <div className="ap-stat">
            <span className="ap-stat-num">{userEssays.length}</span>
            <span className="ap-stat-label">Essays</span>
          </div>
          {isOwnProfile && (
            <div className="ap-stat">
              <span className="ap-stat-num">{likedPostIds.size + likedEssayIds.size}</span>
              <span className="ap-stat-label">Likes</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <nav className="sr-tabs">
          <button
            className={`sr-tab ${activeTab === 'posts' ? 'sr-tab--active' : ''}`}
            onClick={() => switchTab('posts')}
          >
            <span className="sr-tab-label">Posts</span>
            <span className="sr-tab-count">{userPosts.length}</span>
          </button>
          <button
            className={`sr-tab ${activeTab === 'essays' ? 'sr-tab--active' : ''}`}
            onClick={() => switchTab('essays')}
          >
            <span className="sr-tab-label">Essays</span>
            <span className="sr-tab-count">{userEssays.length}</span>
          </button>
          {isOwnProfile && (
            <>
              <button
                className={`sr-tab ${activeTab === 'liked-posts' ? 'sr-tab--active' : ''}`}
                onClick={() => switchTab('liked-posts')}
              >
                <span className="sr-tab-label">Liked Posts</span>
                <span className="sr-tab-count">{likedPosts.length}</span>
              </button>
              <button
                className={`sr-tab ${activeTab === 'liked-essays' ? 'sr-tab--active' : ''}`}
                onClick={() => switchTab('liked-essays')}
              >
                <span className="sr-tab-label">Liked Essays</span>
                <span className="sr-tab-count">{likedEssays.length}</span>
              </button>
            </>
          )}
        </nav>

        {/* Table header */}
        <div className="sr-table-head">
          {isPostTab && (
            <>
              <span className="sr-th sr-th--idx">#</span>
              <span className="sr-th sr-th--title">Title</span>
              <button
                className={`sr-th sr-th--cat sr-th--sortable ${sortKey === 'category' ? 'sr-th--sorted' : ''}`}
                onClick={() => handleSort('category')}
              >
                Category {sortKey === 'category' && <span className="sr-sort-arrow">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </button>
              <button
                className={`sr-th sr-th--date sr-th--sortable ${sortKey === 'date' ? 'sr-th--sorted' : ''}`}
                onClick={() => handleSort('date')}
              >
                Date {sortKey === 'date' && <span className="sr-sort-arrow">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </button>
              <button
                className={`sr-th sr-th--num sr-th--sortable ${sortKey === 'likes' ? 'sr-th--sorted' : ''}`}
                onClick={() => handleSort('likes')}
              >
                Likes {sortKey === 'likes' && <span className="sr-sort-arrow">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </button>
            </>
          )}
          {isEssayTab && (
            <>
              <span className="sr-th sr-th--idx">#</span>
              <span className="sr-th sr-th--title">Title</span>
              <button
                className={`sr-th sr-th--date sr-th--sortable ${sortKey === 'date' ? 'sr-th--sorted' : ''}`}
                onClick={() => handleSort('date')}
              >
                Date {sortKey === 'date' && <span className="sr-sort-arrow">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </button>
              <button
                className={`sr-th sr-th--num sr-th--sortable ${sortKey === 'likes' ? 'sr-th--sorted' : ''}`}
                onClick={() => handleSort('likes')}
              >
                Likes {sortKey === 'likes' && <span className="sr-sort-arrow">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </button>
            </>
          )}
        </div>

        {/* Content list */}
        <div className="sr-list" ref={listRef}>
          {currentResults.length === 0 ? (
            <div className="sr-empty">
              <p>暂无内容</p>
              <span>还没有{emptyMessage}</span>
            </div>
          ) : (
            <>
              {isPostTab && (activeTab === 'posts' ? sortedPosts : sortedLikedPosts).map((post, i) => (
                <div
                  key={post.id}
                  className="sr-row"
                  onClick={() => setSelectedPost(post)}
                >
                  <span className="sr-cell sr-cell--idx">{String(i + 1).padStart(2, '0')}</span>
                  <span className="sr-cell sr-cell--title">{post.title}</span>
                  <span className="sr-cell sr-cell--cat">{post.category}</span>
                  <span className="sr-cell sr-cell--date">{formatDate(post.date)}</span>
                  <span className="sr-cell sr-cell--num">{post.likes}</span>
                  {isOwnProfile && activeTab === 'posts' && (
                    <button
                      className="sr-cell sr-cell--action sr-delete-btn"
                      title="删除帖子"
                      aria-label="删除帖子"
                      onClick={(e) => {
                        e.stopPropagation()
                        toast.warning('确定删除此文章吗？', {
                          label: '确认删除',
                          onClick: async () => {
                            try {
                              await deletePost(post.id)
                              removePost(post.id)
                              toast.success('帖子已删除')
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
                </div>
              ))}

              {isEssayTab && (activeTab === 'essays' ? sortedEssays : sortedLikedEssays).map((essay, i) => (
                <div
                  key={essay.id}
                  className="sr-row"
                  onClick={() => {
                    setSelectedEssay(essay)
                    setIsEssayModalOpen(true)
                  }}
                >
                  <span className="sr-cell sr-cell--idx">{String(i + 1).padStart(2, '0')}</span>
                  <span className="sr-cell sr-cell--title">{essay.title}</span>
                  <span className="sr-cell sr-cell--date">{essay.date}</span>
                  <span className="sr-cell sr-cell--num">{essay.likes}</span>
                  {isOwnProfile && activeTab === 'essays' && (
                    <button
                      className="sr-cell sr-cell--action sr-delete-btn"
                      title="删除随笔"
                      aria-label="删除随笔"
                      onClick={(e) => {
                        e.stopPropagation()
                        toast.warning('确定删除此随笔吗？', {
                          label: '确认删除',
                          onClick: async () => {
                            try {
                              await deleteEssay(essay.id)
                              removeEssay(essay.id)
                              toast.success('随笔已删除')
                            } catch (err) {
                              toast.error(friendlyErrorMessage(err, '删除随笔失败'))
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
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <BlogModal
        post={selectedPost}
        isOpen={!!selectedPost}
        onClose={() => setSelectedPost(null)}
      />

      <EssayModal
        essay={selectedEssay}
        isOpen={isEssayModalOpen}
        onClose={handleCloseEssay}
      />
    </div>
  )
}
