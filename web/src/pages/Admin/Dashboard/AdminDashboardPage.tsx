import { useMemo, useState, useEffect } from 'react'
import StatsCard from '../../../components/Admin/StatsCard'
import DataTable, { type Column } from '../../../components/Admin/DataTable'
import { useOnlineCount } from '../../../hooks/admin/useOnlineCount'
import { fetchAdminStats, fetchAdminActivities, type ActivityLog, type ActivityType, type AdminStats } from '../../../services/mockRuntime'
import { useToast } from '../../../hooks/social/useToast'
import { friendlyErrorMessage } from '../../../services/api'
import './AdminDashboardPage.css'

const activityTypeLabels: Record<ActivityType, string> = {
  new_post: '新文章',
  new_essay: '新随笔',
  new_user: '新注册',
  new_contact: '新消息',
  review_approved: '审核通过',
  review_rejected: '审核拒绝',
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

export default function AdminDashboardPage() {
  const { count: onlineCount } = useOnlineCount()
  const { toast } = useToast()
  
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalPosts: 0,
    totalEssays: 0,
    pendingReviews: 0,
    unreadContacts: 0
  })
  
  const [activities, setActivities] = useState<ActivityLog[]>([])

  useEffect(() => {
    fetchAdminStats().then(setStats).catch(err => toast.error(friendlyErrorMessage(err, '加载统计失败')))
    fetchAdminActivities().then(setActivities).catch(err => toast.error(friendlyErrorMessage(err, '加载活动日志失败')))
  }, [toast])

  const columns = useMemo<Column<ActivityLog>[]>(() => [
    {
      key: 'time',
      title: '时间',
      width: '120px',
      render: row => <span className="adp-time">{formatTime(row.createdAt)}</span>,
    },
    {
      key: 'type',
      title: '类型',
      width: '120px',
      render: row => (
        <span className={`adp-badge adp-badge--${row.type}`}>
          {activityTypeLabels[row.type]}
        </span>
      ),
    },
    {
      key: 'description',
      title: '描述',
      render: row => row.description,
    },
    {
      key: 'operator',
      title: '操作者',
      width: '120px',
      render: row => row.operator,
    },
  ], [])

  return (
    <div className="adp">
      <h1 className="adp__title">Dashboard</h1>

      <div className="adp__stats">
        <StatsCard
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          }
          label="当前在线"
          value={onlineCount}
          valueColor="var(--color-success)"
          trend="实时"
        />
        <StatsCard
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
          label="注册用户"
          value={stats.totalUsers}
          trend=""
        />
        <StatsCard
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10,9 9,9 8,9" />
            </svg>
          }
          label="文章总数"
          value={stats.totalPosts}
        />
        <StatsCard
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          }
          label="待审核"
          value={stats.pendingReviews}
          valueColor="var(--color-badge-pending)"
        />
        <StatsCard
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          }
          label="未读消息"
          value={stats.unreadContacts}
        />
      </div>

      <section className="adp__activity">
        <h2 className="adp__section-title">最近活动</h2>
        <DataTable
          columns={columns}
          data={activities}
          rowKey={row => row.id}
          emptyText="近期没有活动"
        />
      </section>
    </div>
  )
}
