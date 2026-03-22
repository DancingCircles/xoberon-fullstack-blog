import { useNavigate } from 'react-router-dom'
import AnimatedTitle from '../../components/Common/AnimatedTitle'
import SearchBar from '../../components/Common/SearchBar'
import Watermark from '../../components/Common/Watermark'
import './WorksPage.css'

export default function WorksPage() {
  const navigate = useNavigate()

  // 搜索 - 跳转到搜索结果页面
  const handleSearch = (query: string) => {
    if (query.trim()) {
      navigate(`/search/results?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <div className="page page--works">
      {/* Hero Section */}
      <section className="works-hero">
        <Watermark />

        <div className="works-hero__content">
          <h1 className="works-title">
            <AnimatedTitle 
              text="SEARCH" 
              className="works-title-line"
              highlightIndices={[0]}
            />
            <AnimatedTitle 
              text="INSIGHTS" 
              className="works-title-line"
              highlightIndices={[0]}
              delay={0.2}
            />
          </h1>
          
          <div className="works-search-wrapper">
            <SearchBar 
              onSearch={handleSearch} 
              placeholder="搜索帖子、随笔..."
              className="works-search-bar"
            />
          </div>
        </div>
      </section>
    </div>
  )
}
