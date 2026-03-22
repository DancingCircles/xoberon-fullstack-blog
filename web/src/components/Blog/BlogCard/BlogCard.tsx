import type { BlogPost } from '../../../assets/data/mockData'

interface BlogCardProps {
  post: BlogPost
  isActive?: boolean
  showLikes?: boolean
  onClick?: (e: React.MouseEvent) => void
}

export default function BlogCard({ post, isActive = false, showLikes = false, onClick }: BlogCardProps) {
  return (
    <article 
      className={`blog-card ${isActive ? 'active' : ''}`}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <div className="blog-card-header">
        <span className="blog-card-category">{post.category}</span>
        <img 
          className="blog-card-avatar" 
          src={post.author.avatar} 
          alt={post.author.name} 
          title={post.author.name}
        />
      </div>
      <div className="blog-card-content">
        <div className="blog-card-meta">
          <span className="blog-date">{post.date}</span>
          <div className="meta-right">
            {showLikes && (
              <span className="blog-likes" title={`${post.likes} Likes`}>
                ♥ {post.likes}
              </span>
            )}
          </div>
        </div>
        <h2 className="blog-card-title">{post.title}</h2>
        <p className="blog-card-excerpt">{post.excerpt}</p>
        
        {post.tags && post.tags.length > 0 && (
          <div className="blog-card-tags">
            {post.tags.slice(0, 3).map(tag => (
              <span key={tag} className="card-tag">#{tag}</span>
            ))}
          </div>
        )}

        <div className="blog-read-more">
          Read Article
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 5L19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </article>
  )
}
