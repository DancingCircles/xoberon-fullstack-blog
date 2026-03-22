import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import EssayModal from '../../components/Common/EssayModal'
import CreateEssayModal from '../../components/Common/CreateEssayModal'
import Footer from '../../components/Layout/Footer'
import type { EssayItem } from '../../assets/data/mockData'
import { useData } from '../../hooks/auth/useData'
import { useAuth } from '../../hooks/auth/useAuth'
import { groupIntoRows, relocateNewItem } from '../../utils/blogFilters'
import { useDragScroll } from '../../hooks/scroll/useDragScroll'
import CategoryFilter from '../../components/Blog/CategoryFilter'
import FloatingButton from '../../components/Common/FloatingButton'
import './AboutPage.css'

const CARDS_PER_ROW = 6
const MAX_ROWS = 3

export default function AboutPage() {
  const { essays } = useData()
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedEssay, setSelectedEssay] = useState<EssayItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const { requireAuth } = useAuth()
  const handleOpenCreate = useCallback(() => {
    if (!requireAuth()) return
    setIsCreateOpen(true)
  }, [requireAuth])
  const handleCloseCreate = useCallback(() => setIsCreateOpen(false), [])

  const [activeFilter, setActiveFilter] = useState('Latest')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchActive, setIsSearchActive] = useState(false)

  const [newEssayRow, setNewEssayRow] = useState<{ id: string; row: number } | null>(null)

  const filteredEssays = useMemo(() => {
    let result = [...essays]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (e) => e.title.toLowerCase().includes(q) || e.excerpt.toLowerCase().includes(q)
      )
    }

    if (activeFilter === 'Popular') {
      result.sort((a, b) => b.likes - a.likes)
    }

    return result
  }, [essays, activeFilter, searchQuery])

  const [prevFilteredEssays, setPrevFilteredEssays] = useState(filteredEssays)
  if (filteredEssays !== prevFilteredEssays) {
    setPrevFilteredEssays(filteredEssays)
    const prevIds = new Set(prevFilteredEssays.map(e => e.id))
    if (prevIds.size > 0) {
      let found = false
      for (const id of filteredEssays.map(e => e.id)) {
        if (!prevIds.has(id)) {
          let h = 0
          for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0
          setNewEssayRow({ id, row: Math.abs(h) % MAX_ROWS })
          found = true
          break
        }
      }
      if (!found) setNewEssayRow(null)
    }
  }

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

  const essayRows = useMemo(() => {
    const rows = groupIntoRows(filteredEssays, CARDS_PER_ROW, MAX_ROWS)
    if (newEssayRow && rows.length > 0) {
      const hasItem = rows.some(r => r.some(e => e.id === newEssayRow.id))
      if (hasItem) {
        return relocateNewItem(rows, newEssayRow.id, newEssayRow.row)
      }
    }
    return rows
  }, [filteredEssays, newEssayRow])

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const rowLengths = useMemo(() => essayRows.map(r => r.length), [essayRows])
  const { rowViewportRefs, rowTrackRefs, hasDragged } = useDragScroll({ rowLengths })

  useEffect(() => {
    return () => clearTimeout(closeTimerRef.current)
  }, [])

  return (
    <div className="page page--about" ref={containerRef}>
      <section className="about-intro">
        <h2 className="about-intro__title">
          <span className="about-intro__line about-intro__line--dim">We don't</span>
          <span className="about-intro__line about-intro__line--dim">just think.</span>
          <span className="about-intro__line about-intro__line--bold">We do<span className="about-intro__dot">.</span></span>
        </h2>
      </section>

      {/* 随笔区域 */}
      <div className="about-essay">
        {/* 筛选栏 — 复用 CategoryFilter 组件 */}
        <div className="about-essay__filter-section">
          <CategoryFilter
            categories={['Latest', 'Popular']}
            activeCategory={activeFilter}
            onCategoryChange={handleFilterChange}
            searchQuery={searchQuery}
            onSearch={handleSearchChange}
            isSearchActive={isSearchActive}
            onToggleSearch={handleSearchToggle}
          />
        </div>

        {/* 卡片按行排列 — 每行独立可拖拽 */}
        {essayRows.length > 0 ? (
          <div className="about-essay__rows">
            {essayRows.map((row, rowIndex) => (
              <div
                key={rowIndex}
                className="about-essay__row-viewport"
                ref={(el) => { rowViewportRefs.current[rowIndex] = el }}
              >
                <div
                  className="about-essay__row-track"
                  ref={(el) => { rowTrackRefs.current[rowIndex] = el }}
                >
                  {row.map((essay) => (
                    <article
                      key={essay.id}
                      className="essay-card"
                      onClick={() => {
                        if (hasDragged(rowIndex)) return
                        setSelectedEssay(essay)
                        setIsModalOpen(true)
                      }}
                    >
                      {/* Header: 头像 + 昵称 */}
                      <div className="essay-card__header">
                        <img
                          className="essay-card__avatar"
                          src={essay.author.avatar}
                          alt={essay.author.name}
                          title={essay.author.name}
                        />
                        <span className="essay-card__author">{essay.author.name}</span>
                      </div>

                      <div className="essay-card__meta">
                        <span>{essay.date}</span>
                        <span className="essay-card__likes" title={`${essay.likes} Likes`}>
                          ♥ {essay.likes}
                        </span>
                      </div>

                      <h3 className="essay-card__title">{essay.title}</h3>
                      <p className="essay-card__excerpt">{essay.excerpt}</p>
                      <p className="essay-card__content">{essay.content}</p>
                      <span className="essay-card__read">
                        Read Essay
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M12 5L19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="essay-empty-state">
            <h3>No essays found</h3>
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
      </div>

      <Footer />

      <FloatingButton label="ESSAY" onClick={handleOpenCreate} />

      {/* 随笔模态框 */}
      <EssayModal
        essay={selectedEssay}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          closeTimerRef.current = setTimeout(() => setSelectedEssay(null), 300)
        }}
      />

      <CreateEssayModal isOpen={isCreateOpen} onClose={handleCloseCreate} />
    </div>
  )
}
