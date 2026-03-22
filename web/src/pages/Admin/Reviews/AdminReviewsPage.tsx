import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import DataTable, { type Column } from '../../../components/Admin/DataTable'
import DetailModal from '../../../components/Admin/DetailModal'
import { useBodyScrollLock } from '../../../hooks/scroll/useBodyScrollLock'
import { useToast } from '../../../hooks/social/useToast'
import { fetchAdminReviews, reviewApprove, reviewReject, type ReviewItem, type ReviewStatus, type ReviewContentType, type ReviewedBy, type AIDecision } from '../../../services/mockRuntime'
import { useData } from '../../../hooks/auth/useData'
import { friendlyErrorMessage } from '../../../services/api'
import './AdminReviewsPage.css'

const statusTabs: { value: ReviewStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已删除' },
]

const typeTabs: { value: ReviewContentType | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'post', label: '文章' },
  { value: 'essay', label: '随笔' },
  { value: 'comment', label: '评论' },
]

const contentTypeLabels: Record<ReviewContentType, string> = {
  post: 'Post',
  essay: 'Essay',
  comment: 'Comment',
}

const statusLabels: Record<ReviewStatus, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已删除',
}

const reviewedByLabels: Record<ReviewedBy, string> = {
  '': '—',
  ai: 'AI 自动',
  admin: '管理员',
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

const aiDecisionLabels: Record<AIDecision, string> = {
  '': '—',
  approve: '通过',
  review: '待审',
  reject: '违规',
}

export default function AdminReviewsPage() {
  const { toast } = useToast()
  const { removePost, removeEssay, refreshPosts, refreshEssays } = useData()
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<ReviewContentType | 'all'>('all')
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [detailItem, setDetailItem] = useState<ReviewItem | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    let ignore = false
    fetchAdminReviews()
      .then(data => { if (!ignore) setReviews(data) })
      .catch(err => toast.error(friendlyErrorMessage(err, '获取审核列表失败')))
    return () => { ignore = true }
  }, [toast])

  useBodyScrollLock(rejectModalOpen)

  const filtered = useMemo(() => {
    return reviews.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (typeFilter !== 'all' && r.contentType !== typeFilter) return false
      return true
    })
  }, [reviews, statusFilter, typeFilter])

  const handleApprove = useCallback(async (id: string) => {
    const targetReview = reviews.find(r => r.id === id)
    try {
      await reviewApprove(id)
      setReviews(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' as ReviewStatus } : r))
      if (targetReview?.contentType === 'post') {
        refreshPosts()
      } else if (targetReview?.contentType === 'essay') {
        refreshEssays()
      } else if (targetReview?.contentType === 'comment') {
        refreshPosts()
      }
      toast.success('已通过该内容')
    } catch (err) {
      toast.error(friendlyErrorMessage(err, '操作失败'))
    }
  }, [reviews, toast, refreshPosts, refreshEssays])

  const handleOpenReject = useCallback((id: string) => {
    setRejectTarget(id)
    setRejectReason('')
    setRejectModalOpen(true)
  }, [])

  const handleCloseReject = useCallback(() => {
    setRejectModalOpen(false)
    setRejectTarget(null)
    setRejectReason('')
  }, [])

  const handleOpenDetail = useCallback((item: ReviewItem) => {
    setDetailItem(item)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setDetailItem(null)
  }, [])

  const handleConfirmReject = useCallback(async () => {
    if (!rejectTarget || !rejectReason.trim()) return
    const targetReview = reviews.find(r => r.id === rejectTarget)
    try {
      await reviewReject(rejectTarget, rejectReason.trim())
      setReviews(prev => prev.map(r =>
        r.id === rejectTarget
          ? { ...r, status: 'rejected' as ReviewStatus, rejectReason: rejectReason.trim(), reviewedBy: 'admin' as ReviewedBy }
          : r
      ))
      if (targetReview?.contentType === 'post') {
        removePost(targetReview.contentId)
      } else if (targetReview?.contentType === 'essay') {
        removeEssay(targetReview.contentId)
      } else if (targetReview?.contentType === 'comment') {
        refreshPosts()
      }
      toast.success('已删除该内容')
    } catch (err) {
      toast.error(friendlyErrorMessage(err, '操作失败'))
    }
    handleCloseReject()
  }, [rejectTarget, rejectReason, reviews, handleCloseReject, toast, removePost, removeEssay, refreshPosts])

  useEffect(() => {
    if (!rejectModalOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseReject()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [rejectModalOpen, handleCloseReject])

  useEffect(() => {
    if (rejectModalOpen && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [rejectModalOpen])

  const columns = useMemo<Column<ReviewItem>[]>(() => [
    {
      key: 'title',
      title: '标题 / 内容预览',
      render: row => (
        <div className="arp-title-cell">
          <button className="arp-title-link" onClick={() => handleOpenDetail(row)}>
            {row.title}
          </button>
          <span className="arp-excerpt">{row.excerpt.slice(0, 60)}…</span>
        </div>
      ),
    },
    {
      key: 'author',
      title: '作者',
      width: '120px',
      render: row => (
        <div className="arp-author">
          <img src={row.authorAvatar} alt={row.authorName} className="arp-author-avatar" />
          <span>{row.authorName}</span>
        </div>
      ),
    },
    {
      key: 'type',
      title: '类型',
      render: row => (
        <span className={`arp-type-badge arp-type-badge--${row.contentType}`}>
          {contentTypeLabels[row.contentType]}
        </span>
      ),
    },
    {
      key: 'aiDecision',
      title: 'AI 判定',
      width: '80px',
      render: row => (
        <span className={`arp-decision arp-decision--${row.aiDecision || 'none'}`}>
          {aiDecisionLabels[row.aiDecision]}
        </span>
      ),
    },
    {
      key: 'time',
      title: '提交时间',
      width: '110px',
      render: row => <span className="arp-time">{formatTime(row.createdAt)}</span>,
    },
    {
      key: 'reviewedBy',
      title: '操作人',
      width: '90px',
      render: row => (
        <span className={`arp-reviewer arp-reviewer--${row.reviewedBy || 'none'}`}>
          {reviewedByLabels[row.reviewedBy]}
        </span>
      ),
    },
    {
      key: 'status',
      title: '状态',
      width: '80px',
      render: row => (
        <span className={`arp-status arp-status--${row.status}`}>
          {statusLabels[row.status]}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      width: '140px',
      render: row => {
        if (row.status === 'rejected') return <span className="arp-actions-done">—</span>
        return (
          <div className="arp-actions">
            {row.status !== 'approved' && (
              <button className="arp-btn arp-btn--approve" onClick={() => handleApprove(row.id)}>
                通过
              </button>
            )}
            <button className="arp-btn arp-btn--reject" onClick={() => handleOpenReject(row.id)}>
              删除
            </button>
          </div>
        )
      },
    },
  ], [handleApprove, handleOpenReject, handleOpenDetail])

  return (
    <div className="arp">
      <h1 className="arp__title">Content Review</h1>

      <div className="arp__filters">
        <div className="arp__filter-group">
          <span className="arp__filter-label">状态</span>
          <div className="arp__tabs">
            {statusTabs.map(tab => (
              <button
                key={tab.value}
                className={`arp__tab ${statusFilter === tab.value ? 'arp__tab--active' : ''}`}
                onClick={() => setStatusFilter(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="arp__filter-group">
          <span className="arp__filter-label">类型</span>
          <div className="arp__tabs">
            {typeTabs.map(tab => (
              <button
                key={tab.value}
                className={`arp__tab ${typeFilter === tab.value ? 'arp__tab--active' : ''}`}
                onClick={() => setTypeFilter(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={row => row.id}
        emptyText="没有符合条件的审核内容"
      />

      {rejectModalOpen && createPortal(
        <div className="arp-reject-overlay" onClick={handleCloseReject}>
          <div
            className="arp-reject-modal"
            role="dialog"
            aria-modal="true"
            aria-label="拒绝原因"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="arp-reject-modal__title">删除原因</h3>
            <textarea
              ref={textareaRef}
              className="arp-reject-modal__textarea"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="请输入删除原因…"
              rows={4}
              maxLength={300}
            />
            <div className="arp-reject-modal__actions">
              <button className="arp-btn arp-btn--cancel" onClick={handleCloseReject}>
                取消
              </button>
              <button
                className="arp-btn arp-btn--confirm"
                onClick={handleConfirmReject}
                disabled={!rejectReason.trim()}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      <DetailModal
        isOpen={detailItem !== null}
        onClose={handleCloseDetail}
        title={detailItem?.title ?? ''}
        headerMeta={detailItem ? (
          <>
            <span className={`arp-type-badge arp-type-badge--${detailItem.contentType}`}>
              {contentTypeLabels[detailItem.contentType]}
            </span>
            <span className={`arp-status arp-status--${detailItem.status}`}>
              {statusLabels[detailItem.status]}
            </span>
          </>
        ) : undefined}
        footer={detailItem && detailItem.status !== 'rejected' ? (
          <>
            {detailItem.status !== 'approved' && (
              <button className="arp-btn arp-btn--approve" onClick={() => { handleApprove(detailItem.id); handleCloseDetail() }}>
                通过
              </button>
            )}
            <button className="arp-btn arp-btn--reject" onClick={() => { handleCloseDetail(); handleOpenReject(detailItem.id) }}>
              删除
            </button>
          </>
        ) : undefined}
      >
        {detailItem && (
          <>
            <div className="arp-detail__author">
              <img src={detailItem.authorAvatar} alt={detailItem.authorName} className="arp-detail__avatar" />
              <span className="arp-detail__author-name">{detailItem.authorName}</span>
              <span className="arp-detail__time">{formatTime(detailItem.createdAt)}</span>
            </div>
            <div className="arp-detail__decision">
              <span className="arp-detail__decision-label">AI 判定</span>
              <span className={`arp-decision arp-decision--${detailItem.aiDecision || 'none'}`}>
                {aiDecisionLabels[detailItem.aiDecision]}
              </span>
            </div>
            <div className="arp-detail__content">
              {detailItem.fullContent.split('\n').map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
            {detailItem.status === 'rejected' && (
              <div className="arp-detail__reject-info">
                <div className="arp-detail__reject-meta">
                  <span className="arp-detail__reject-label">删除方式：</span>
                  <span className={`arp-reviewer arp-reviewer--${detailItem.reviewedBy || 'none'}`}>
                    {reviewedByLabels[detailItem.reviewedBy]}
                  </span>
                </div>
                {detailItem.rejectReason && (
                  <div className="arp-detail__reject-meta">
                    <span className="arp-detail__reject-label">删除原因：</span>
                    <span>{detailItem.rejectReason}</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </DetailModal>
    </div>
  )
}
