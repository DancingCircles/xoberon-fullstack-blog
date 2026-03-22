import { useState, useMemo, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import DataTable, { type Column } from '../../../components/Admin/DataTable'
import { useBodyScrollLock } from '../../../hooks/scroll/useBodyScrollLock'
import { useAuth } from '../../../hooks/auth/useAuth'
import type { UserProfile, UserRole } from '../../../assets/data/types'
import { fetchAdminUsers, updateUserRole } from '../../../services/mockRuntime'
import { useToast } from '../../../hooks/social/useToast'
import { friendlyErrorMessage } from '../../../services/api'
import './AdminUsersPage.css'

const roleTabs: { value: UserRole | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'admin', label: 'Admin' },
  { value: 'user', label: 'User' },
]

const roleLabels: Record<UserRole, string> = {
  owner: '站长',
  admin: '管理员',
  user: '普通用户',
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface PendingRoleChange {
  userId: string
  userName: string
  currentRole: UserRole
  newRole: UserRole
}

export default function AdminUsersPage() {
  const { isOwner } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [_total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [pendingChange, setPendingChange] = useState<PendingRoleChange | null>(null)
  const [_isLoading, setIsLoading] = useState(true)

  useBodyScrollLock(pendingChange !== null)

  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetchAdminUsers({ page: 1, pageSize: 100 })
      setUsers(res.items)
      setTotal(res.total)
    } catch (err) {
      toast.error(friendlyErrorMessage(err, '加载用户失败'))
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return users.filter(u => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false
      if (q && !u.name.toLowerCase().includes(q) && !u.handle.toLowerCase().includes(q) && !u.email?.toLowerCase().includes(q)) {
        return false
      }
      return true
    })
  }, [users, search, roleFilter])

  const handleRequestRoleChange = useCallback((user: UserProfile, newRole: UserRole) => {
    if (user.role === newRole) return
    if (user.role === 'owner') return
    if (user.role === 'admin' && !isOwner) return
    setPendingChange({
      userId: user.id,
      userName: user.name,
      currentRole: user.role,
      newRole,
    })
  }, [isOwner])

  const handleCloseConfirm = useCallback(() => {
    setPendingChange(null)
  }, [])

  const handleConfirmRoleChange = useCallback(async () => {
    if (!pendingChange) return
    try {
      await updateUserRole(pendingChange.userId, pendingChange.newRole)
      setUsers(prev => prev.map(u =>
        u.id === pendingChange.userId ? { ...u, role: pendingChange.newRole } : u,
      ))
      toast.success('角色已更新')
    } catch (err) {
      toast.error(friendlyErrorMessage(err, '更新角色失败'))
    } finally {
      setPendingChange(null)
    }
  }, [pendingChange, toast])

  useEffect(() => {
    if (!pendingChange) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseConfirm()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [pendingChange, handleCloseConfirm])

  const columns = useMemo<Column<UserProfile>[]>(() => [
    {
      key: 'avatar',
      title: '',
      width: '44px',
      className: 'dt-col--compact',
      render: row => (
        <img src={row.avatar} alt={row.name} className="aup-avatar" />
      ),
    },
    {
      key: 'name',
      title: '用户名',
      width: '120px',
      render: row => <span className="aup-name">{row.name}</span>,
    },
    {
      key: 'handle',
      title: 'Handle',
      width: '120px',
      render: row => <span className="aup-handle">{row.handle}</span>,
    },
    {
      key: 'email',
      title: '邮箱',
      render: row => <span className="aup-email">{row.email || '-'}</span>,
    },
    {
      key: 'role',
      title: '角色',
      width: '80px',
      render: row => (
        <span className={`aup-role aup-role--${row.role}`}>
          {row.role === 'owner' ? 'owner' : row.role}
        </span>
      ),
    },
    {
      key: 'posts',
      title: '文章',
      width: '56px',
      render: row => row.postCount,
    },
    {
      key: 'essays',
      title: '随笔',
      width: '56px',
      render: row => row.essayCount,
    },
    {
      key: 'createdAt',
      title: '注册时间',
      width: '100px',
      render: row => <span className="aup-date">{formatDate(row.createdAt || new Date().toISOString())}</span>,
    },
    {
      key: 'actions',
      title: '操作',
      width: '100px',
      render: row => {
        if (row.role === 'owner') {
          return <span className="aup-protected">受保护</span>
        }
        if (row.role === 'admin' && !isOwner) {
          return <span className="aup-no-perm">无权限</span>
        }
        const targetRole: UserRole = row.role === 'admin' ? 'user' : 'admin'
        return (
          <button
            className={`aup-role-btn aup-role-btn--${targetRole}`}
            onClick={() => handleRequestRoleChange(row, targetRole)}
          >
            {targetRole === 'admin' ? '设为管理员' : '取消管理员'}
          </button>
        )
      },
    },
  ], [handleRequestRoleChange, isOwner])

  return (
    <div className="aup">
      <h1 className="aup__title">Users</h1>

      <div className="aup__toolbar">
        <input
          className="aup__search"
          type="text"
          placeholder="搜索用户名 / Handle / 邮箱…"
          value={search}
          maxLength={50}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="aup__tabs">
          {roleTabs.map(tab => (
            <button
              key={tab.value}
              className={`aup__tab ${roleFilter === tab.value ? 'aup__tab--active' : ''}`}
              onClick={() => setRoleFilter(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={row => row.id}
        emptyText="没有符合条件的用户"
      />

      {pendingChange && createPortal(
        <div className="aup-confirm-overlay" onClick={handleCloseConfirm}>
          <div
            className="aup-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-label="确认角色变更"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="aup-confirm-modal__title">权限变更确认</h3>
            <div className="aup-confirm-modal__body">
              <div className="aup-confirm-modal__user">{pendingChange.userName}</div>
              <div className="aup-confirm-modal__flow">
                <span className={`aup-confirm-badge aup-confirm-badge--${pendingChange.currentRole}`}>
                  {roleLabels[pendingChange.currentRole]}
                </span>
                <span className="aup-confirm-arrow">→</span>
                <span className={`aup-confirm-badge aup-confirm-badge--${pendingChange.newRole}`}>
                  {roleLabels[pendingChange.newRole]}
                </span>
              </div>
              {pendingChange.newRole === 'admin' && (
                <p className="aup-confirm-modal__warning">
                  将赋予完整后台管理权限
                </p>
              )}
            </div>
            <div className="aup-confirm-modal__actions">
              <button className="aup-confirm-btn aup-confirm-btn--cancel" onClick={handleCloseConfirm}>
                取消
              </button>
              <button className="aup-confirm-btn aup-confirm-btn--confirm" onClick={handleConfirmRoleChange}>
                确认
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
