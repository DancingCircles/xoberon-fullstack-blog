import { useState, useEffect, useRef, useMemo } from 'react'
import BlogModal from '../BlogModal'
import BlogCard from '../BlogCard'
import type { BlogPost } from '../../../assets/data/mockData'
import { useData } from '../../../hooks/auth/useData'
import { filterAndSortPosts, extractUniqueCategories, groupIntoRows, relocateNewItem } from '../../../utils/blogFilters'
import { useDragScroll } from '../../../hooks/scroll/useDragScroll'

import CategoryFilter from '../CategoryFilter'

const CARDS_PER_ROW = 5
const MAX_ROWS = 3

export default function BlogList() {
  const { posts: blogPosts } = useData()
  const [activeFilter, setActiveFilter] = useState('Latest')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchActive, setIsSearchActive] = useState(false)
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const [newPostRow, setNewPostRow] = useState<{ id: string; row: number } | null>(null)

  const uniqueCategories = extractUniqueCategories(blogPosts)
  const filterOptions = ['Latest', 'Popular', ...uniqueCategories]

  const filteredPosts = useMemo(
    () => filterAndSortPosts(blogPosts, activeFilter, searchQuery),
    [blogPosts, activeFilter, searchQuery]
  )

  const [prevFilteredPosts, setPrevFilteredPosts] = useState(filteredPosts)
  if (filteredPosts !== prevFilteredPosts) {
    setPrevFilteredPosts(filteredPosts)
    const prevIds = new Set(prevFilteredPosts.map(p => p.id))
    if (prevIds.size > 0) {
      let found = false
      for (const id of filteredPosts.map(p => p.id)) {
        if (!prevIds.has(id)) {
          let h = 0
          for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0
          setNewPostRow({ id, row: Math.abs(h) % MAX_ROWS })
          found = true
          break
        }
      }
      if (!found) setNewPostRow(null)
    }
  }

  const postRows = useMemo(() => {
    const rows = groupIntoRows(filteredPosts, CARDS_PER_ROW, MAX_ROWS)
    if (newPostRow && rows.length > 0) {
      const hasItem = rows.some(r => r.some(p => p.id === newPostRow.id))
      if (hasItem) {
        return relocateNewItem(rows, newPostRow.id, newPostRow.row)
      }
    }
    return rows
  }, [filteredPosts, newPostRow])

  const rowLengths = useMemo(() => postRows.map(r => r.length), [postRows])
  const { rowViewportRefs, rowTrackRefs, hasDragged } = useDragScroll({ rowLengths })

  // Focus search input
  useEffect(() => {
    if (isSearchActive && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isSearchActive])

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter)
  }

  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
  }

  const handleSearchToggle = () => {
    setIsSearchActive(!isSearchActive)
    if (isSearchActive) {
      setSearchQuery('')
    }
  }

  const handlePostClick = (post: BlogPost, rowIdx: number, e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    if (hasDragged(rowIdx)) return
    setSelectedPost(post)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    closeTimerRef.current = setTimeout(() => setSelectedPost(null), 300)
  }

  useEffect(() => {
    return () => clearTimeout(closeTimerRef.current)
  }, [])

  return (
    <>
      <div className="blog-filter-section">
        <CategoryFilter
          categories={filterOptions}
          activeCategory={activeFilter}
          onCategoryChange={handleFilterChange}
          searchQuery={searchQuery}
          onSearch={handleSearchChange}
          isSearchActive={isSearchActive}
          onToggleSearch={handleSearchToggle}
        />
      </div>

      {postRows.length > 0 ? (
        <div className="blog-rows">
          {postRows.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="blog-row-viewport"
              ref={(el) => { rowViewportRefs.current[rowIndex] = el }}
            >
              <div
                className="blog-row-track"
                ref={(el) => { rowTrackRefs.current[rowIndex] = el }}
              >
                {row.map((post) => (
                  <BlogCard
                    key={post.id}
                    post={post}
                    showLikes
                    onClick={(e) => handlePostClick(post, rowIndex, e)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="blog-empty-state">
          <h3>No articles found</h3>
          <p>Try adjusting your search or filters.</p>
          <button
            className="reset-btn"
            onClick={() => {
              setActiveFilter('Latest')
              setSearchQuery('')
              setIsSearchActive(false)
            }}
          >
            Reset Filters
          </button>
        </div>
      )}

      <BlogModal
        post={selectedPost}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onPostClick={(post) => handlePostClick(post, 0)}
      />
    </>
  )
}
