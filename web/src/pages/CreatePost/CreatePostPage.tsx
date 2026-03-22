import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/auth/useAuth'
import { useData } from '../../hooks/auth/useData'
import { useToast } from '../../hooks/social/useToast'
import { friendlyErrorMessage } from '../../services/api'
import type { BlogCategory } from '../../assets/data/types'
import MarkdownRenderer from '../../components/Common/MarkdownRenderer'
import Footer from '../../components/Layout/Footer'
import './CreatePostPage.css'

export default function CreatePostPage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { addPost } = useData()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    excerpt: '',
    content: '',
    tags: ''
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser || isSubmitting) return
    if (!formData.title.trim()) { toast.info('请输入标题'); return }
    if (formData.title.trim().length > 30) { toast.info('标题不能超过 30 字符'); return }
    if (!formData.category) { toast.info('请选择分类'); return }
    if (!formData.content.trim()) { toast.info('请输入内容'); return }
    if (formData.content.trim().length < 20) { toast.info('内容至少 20 字'); return }
    if (formData.content.trim().length > 2000) { toast.info('内容不能超过 2000 字'); return }
    const tagList = formData.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean)
    if (tagList.length > 3) { toast.info('标签最多 3 个'); return }
    if (tagList.some(t => t.length > 30)) { toast.info('单个标签不能超过 30 字符'); return }

    setIsSubmitting(true)
    try {
      await addPost({
        title: formData.title.trim(),
        content: formData.content.trim(),
        category: formData.category as BlogCategory,
        tags: tagList,
      })
      toast.success('帖子已发布')
      navigate('/journal')
    } catch (err) {
      toast.error(friendlyErrorMessage(err, '发布失败，请稍后重试'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="page page--create-post">
      <div className="create-post-container">
        <header className="create-post-header">
          <h1 className="create-post-title">NEW POST</h1>
          <button className="close-btn" onClick={() => navigate('/journal')}>CLOSE</button>
        </header>

        <form className="create-post-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            {/* Left: Inputs */}
            <div className="form-section">
              <div className="input-group">
                <label>TITLE</label>
                <input 
                  type="text" 
                  name="title" 
                  value={formData.title} 
                  onChange={handleInputChange} 
                  placeholder="Enter post title"
                  maxLength={30}
                  required 
                />
                <span className="write-char-count">{formData.title.length}/30</span>
              </div>

              <div className="input-row">
                <div className="input-group">
                  <label>CATEGORY</label>
                  <select 
                    name="category" 
                    value={formData.category} 
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Category</option>
                    <option value="Design">Design</option>
                    <option value="Tech">Tech</option>
                    <option value="Culture">Culture</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>TAGS</label>
                  <input 
                    type="text" 
                    name="tags" 
                    value={formData.tags} 
                    onChange={handleInputChange} 
                    placeholder="Comma separated tags"
                    maxLength={60}
                  />
                </div>
              </div>

              <div className="input-group">
                <label>EXCERPT</label>
                <textarea 
                  name="excerpt" 
                  value={formData.excerpt} 
                  onChange={handleInputChange} 
                  rows={3} 
                  placeholder="Brief summary"
                  maxLength={150}
                  required
                />
              </div>

              <div className="input-group content-editor">
                <label>CONTENT (MARKDOWN)</label>
                <textarea 
                  name="content" 
                  value={formData.content} 
                  onChange={e => setFormData(prev => ({ ...prev, content: e.target.value.slice(0, 2000) }))}
                  placeholder="# Hello World..."
                  maxLength={2000}
                  required
                />
                <span className="write-char-count">{formData.content.length}/2000</span>
              </div>
            </div>

            {/* Right: Preview */}
            <div className="preview-section">
              <label>PREVIEW</label>
              <div className="preview-box">
                {formData.title || formData.content ? (
                  <div className="preview-content">
                    {/* Simulated Header */}
                    <div className="preview-header">
                      <span className="preview-category">{formData.category || 'Category'}</span>
                      <h1 className="preview-title">{formData.title || 'Post Title'}</h1>
                      <div className="preview-meta">
                        <span>{new Date().toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '')}</span>
                      </div>
                      {formData.tags && (
                        <div className="preview-tags">
                          {formData.tags.split(/[,，]/).map(tag => (
                            <span key={tag} className="preview-tag">#{tag.trim()}</span>
                          ))}
                        </div>
                      )}
                      <hr className="preview-divider"/>
                    </div>
                    <MarkdownRenderer content={formData.content} />
                  </div>
                ) : (
                  <div className="preview-placeholder">Preview will appear here...</div>
                )}
              </div>
            </div>
          </div>

          <div className="form-footer">
            <button type="submit" className="submit-btn">PUBLISH POST</button>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  )
}

