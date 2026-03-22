import type { BlogPost } from '../../../assets/data/mockData'
import { useData } from '../../../hooks/auth/useData'
import './RelatedPosts.css'

interface RelatedPostsProps {
  currentPost: BlogPost
  onPostClick: (post: BlogPost) => void
}

export default function RelatedPosts({ currentPost, onPostClick }: RelatedPostsProps) {
  const { posts } = useData()
  const related = posts
    .filter(p => p.id !== currentPost.id && p.category === currentPost.category)
    .slice(0, 3)

  if (related.length === 0) return null

  return (
    <div className="related-posts">
      <h3 className="related-title">READ NEXT</h3>
      <div className="related-grid">
        {related.map(post => (
          <div 
            key={post.id} 
            className="related-card"
            onClick={() => onPostClick(post)}
          >
            <div className="related-category">{post.category}</div>
            <h4 className="related-card-title">{post.title}</h4>
            <div className="related-meta">
              <span>{post.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
