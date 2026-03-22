import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import type { BlogPost, EssayItem, UserProfile } from '../../assets/data/mockData'
import { fetchPosts, fetchEssays, searchUsers } from '../../services/mockRuntime'
import { formatDate } from '../../utils/dateUtils'
import BlogModal from '../../components/Blog/BlogModal'
import EssayModal from '../../components/Common/EssayModal'
import './SearchResultsPage.css'

type SearchTab = 'posts' | 'notes' | 'users'
type SortKey = 'category' | 'date' | 'likes' | null
type SortDir = 'asc' | 'desc'

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const query = searchParams.get('q') || ''

  const [activeTab, setActiveTab] = useState<SearchTab>('posts')
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null)
  const [selectedEssay, setSelectedEssay] = useState<EssayItem | null>(null)
  const [isEssayModalOpen, setIsEssayModalOpen] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>(null)
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [postResults, setPostResults] = useState<BlogPost[]>([])
  const [noteResults, setNoteResults] = useState<EssayItem[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const listRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!query) {
      debounceRef.current = setTimeout(() => {
        setPostResults([])
        setNoteResults([])
        setUsers([])
      }, 0)
      return () => clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      Promise.allSettled([
        fetchPosts({ keyword: query, pageSize: 50 }),
        fetchEssays({ keyword: query, pageSize: 50 }),
        searchUsers(query),
      ]).then(([postsR, essaysR, usersR]) => {
        if (postsR.status === 'fulfilled') setPostResults(postsR.value.items)
        if (essaysR.status === 'fulfilled') setNoteResults(essaysR.value.items)
        if (usersR.status === 'fulfilled') setUsers(usersR.value)
      })
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }, [sortKey])

  const userResults = users

  const totalCount = postResults.length + noteResults.length + userResults.length

  const sortedPostResults = useMemo(() => {
    if (!sortKey) return postResults
    const sorted = [...postResults]
    const dir = sortDir === 'asc' ? 1 : -1
    sorted.sort((a, b) => {
      if (sortKey === 'category') return a.category.localeCompare(b.category) * dir
      if (sortKey === 'date') return (new Date(a.date).getTime() - new Date(b.date).getTime()) * dir
      if (sortKey === 'likes') return (a.likes - b.likes) * dir
      return 0
    })
    return sorted
  }, [postResults, sortKey, sortDir])

  const sortedNoteResults = useMemo(() => {
    if (!sortKey) return noteResults
    const sorted = [...noteResults]
    const dir = sortDir === 'asc' ? 1 : -1
    sorted.sort((a, b) => {
      if (sortKey === 'date') return (new Date(a.date).getTime() - new Date(b.date).getTime()) * dir
      if (sortKey === 'likes') return (a.likes - b.likes) * dir
      return 0
    })
    return sorted
  }, [noteResults, sortKey, sortDir])

  const currentResults = useMemo(() => {
    if (activeTab === 'posts') return sortedPostResults
    if (activeTab === 'notes') return sortedNoteResults
    return userResults
  }, [activeTab, sortedPostResults, sortedNoteResults, userResults])

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

  return (
    <div className="page page--search">
      <div className="sr-container">
        {/* Header */}
        <header className="sr-header">
          <button className="sr-back" onClick={handleBack}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="sr-header-info">
            <h1 className="sr-query">{query || '...'}</h1>
            <span className="sr-total">{totalCount} results</span>
          </div>
        </header>

        {/* Tabs */}
        <nav className="sr-tabs">
          <button
            className={`sr-tab ${activeTab === 'posts' ? 'sr-tab--active' : ''}`}
            onClick={() => { setActiveTab('posts'); setSortKey(null) }}
          >
            <span className="sr-tab-label">帖子</span>
            <span className="sr-tab-count">{postResults.length}</span>
          </button>
          <button
            className={`sr-tab ${activeTab === 'notes' ? 'sr-tab--active' : ''}`}
            onClick={() => { setActiveTab('notes'); setSortKey(null) }}
          >
            <span className="sr-tab-label">随笔</span>
            <span className="sr-tab-count">{noteResults.length}</span>
          </button>
          <button
            className={`sr-tab ${activeTab === 'users' ? 'sr-tab--active' : ''}`}
            onClick={() => { setActiveTab('users'); setSortKey(null) }}
          >
            <span className="sr-tab-label">用户</span>
            <span className="sr-tab-count">{userResults.length}</span>
          </button>
        </nav>

        {/* Table header */}
        <div className="sr-table-head">
          {activeTab === 'posts' && (
            <>
              <span className="sr-th sr-th--idx">#</span>
              <span className="sr-th sr-th--title">Title</span>
              <button className={`sr-th sr-th--cat sr-th--sortable ${sortKey === 'category' ? 'sr-th--sorted' : ''}`} onClick={() => handleSort('category')}>
                Category {sortKey === 'category' && <span className="sr-sort-arrow">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </button>
              <button className={`sr-th sr-th--date sr-th--sortable ${sortKey === 'date' ? 'sr-th--sorted' : ''}`} onClick={() => handleSort('date')}>
                Date {sortKey === 'date' && <span className="sr-sort-arrow">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </button>
              <button className={`sr-th sr-th--num sr-th--sortable ${sortKey === 'likes' ? 'sr-th--sorted' : ''}`} onClick={() => handleSort('likes')}>
                Likes {sortKey === 'likes' && <span className="sr-sort-arrow">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </button>
            </>
          )}
          {activeTab === 'notes' && (
            <>
              <span className="sr-th sr-th--idx">#</span>
              <span className="sr-th sr-th--title">Title</span>
              <span className="sr-th sr-th--author">Author</span>
              <button className={`sr-th sr-th--date sr-th--sortable ${sortKey === 'date' ? 'sr-th--sorted' : ''}`} onClick={() => handleSort('date')}>
                Date {sortKey === 'date' && <span className="sr-sort-arrow">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </button>
              <button className={`sr-th sr-th--num sr-th--sortable ${sortKey === 'likes' ? 'sr-th--sorted' : ''}`} onClick={() => handleSort('likes')}>
                Likes {sortKey === 'likes' && <span className="sr-sort-arrow">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </button>
            </>
          )}
          {activeTab === 'users' && (
            <>
              <span className="sr-th sr-th--idx">#</span>
              <span className="sr-th sr-th--title">User</span>
              <span className="sr-th sr-th--role">Role</span>
              <span className="sr-th sr-th--bio">Bio</span>
            </>
          )}
        </div>

        {/* Results list */}
        <div className="sr-list" ref={listRef}>
          {currentResults.length === 0 ? (
            <div className="sr-empty">
              <p>没有找到相关结果</p>
              <span>尝试使用其他关键词搜索</span>
            </div>
          ) : (
            <>
              {activeTab === 'posts' && sortedPostResults.map((post, i) => (
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
                </div>
              ))}

              {activeTab === 'notes' && sortedNoteResults.map((essay, i) => (
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
                  <span className="sr-cell sr-cell--author">{essay.author.name}</span>
                  <span className="sr-cell sr-cell--date">{essay.date}</span>
                  <span className="sr-cell sr-cell--num">{essay.likes}</span>
                </div>
              ))}

              {activeTab === 'users' && userResults.map((user, i) => (
                <div
                  key={user.id}
                  className="sr-row sr-row--user"
                  onClick={() => navigate(`/author/${user.handle.replace('@', '')}`)}
                >
                  <span className="sr-cell sr-cell--idx">{String(i + 1).padStart(2, '0')}</span>
                  <span className="sr-cell sr-cell--title sr-cell--user-name">
                    <img className="sr-avatar" src={user.avatar} alt={user.name} />
                    <span>
                      <strong>{user.name}</strong>
                      <em>{user.handle}</em>
                    </span>
                  </span>
                  <span className="sr-cell sr-cell--role">{user.role}</span>
                  <span className="sr-cell sr-cell--bio">{user.bio}</span>
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
