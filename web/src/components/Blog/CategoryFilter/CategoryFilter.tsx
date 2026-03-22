import React, { useRef, useEffect } from 'react'
import './CategoryFilter.css'

interface CategoryFilterProps {
  categories: string[]
  activeCategory: string
  onCategoryChange: (category: string) => void
  onSearch: (query: string) => void
  searchQuery: string
  isSearchActive: boolean
  onToggleSearch: () => void
}

export default function CategoryFilter({
  categories,
  activeCategory,
  onCategoryChange,
  onSearch,
  searchQuery,
  isSearchActive,
  onToggleSearch
}: CategoryFilterProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Auto focus search input
  useEffect(() => {
    if (isSearchActive && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isSearchActive])

  // Horizontal scroll handling
  const handleWheel = (e: React.WheelEvent) => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft += e.deltaY
    }
  }

  return (
    <div className="category-filter-container">
      <div className={`filter-bar ${isSearchActive ? 'search-mode' : ''}`}>
        
        {/* Categories Scroll Area */}
        <div 
          className={`categories-scroll-wrapper ${isSearchActive ? 'hidden' : ''}`}
          ref={scrollRef}
          onWheel={handleWheel}
        >
          <div className="categories-track">
            {categories.map((category) => (
              <button
                key={category}
                className={`category-pill ${activeCategory === category ? 'active' : ''}`}
                onClick={() => onCategoryChange(category)}
              >
                <span className="category-text">{category}</span>
                {activeCategory === category && (
                  <span className="active-dot" />
                )}
              </button>
            ))}
          </div>
          {/* Fade gradients for scrolling indication */}
          <div className="scroll-fade-left" />
          <div className="scroll-fade-right" />
        </div>

        {/* Search Area */}
        <div className={`search-wrapper ${isSearchActive ? 'expanded' : ''}`}>
          {isSearchActive ? (
            <div className="search-input-container">
              <input
                ref={searchInputRef}
                type="text"
                className="search-input"
                placeholder="Search articles..."
                value={searchQuery}
                maxLength={50}
                onChange={(e) => onSearch(e.target.value)}
              />
              <button 
                className="search-close-btn" 
                onClick={onToggleSearch}
                aria-label="Close search"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6L18 18" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          ) : (
            <button 
              className="search-trigger-btn"
              onClick={onToggleSearch}
              aria-label="Open search"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
