import { useState, useMemo, useCallback, useEffect } from 'react'
import DataTable, { type Column } from '../../../components/Admin/DataTable'
import { fetchAdminContacts, markContactRead, type AdminContact } from '../../../services/runtime'
import { useToast } from '../../../hooks/social/useToast'
import { friendlyErrorMessage } from '../../../services/api'
import './AdminContactsPage.css'

type ReadFilter = 'all' | 'unread' | 'read'

const readTabs: { value: ReadFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'unread', label: '未读' },
  { value: 'read', label: '已读' },
]

function formatTime(iso: string): string {
  const d = new Date(iso)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

export default function AdminContactsPage() {
  const { toast } = useToast()
  const [contacts, setContacts] = useState<AdminContact[]>([])
  const [_total, setTotal] = useState(0)
  const [_isLoading, setIsLoading] = useState(true)
  const [readFilter, setReadFilter] = useState<ReadFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const loadContacts = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetchAdminContacts({ page: 1, pageSize: 100 })
      setContacts(res.items)
      setTotal(res.total)
    } catch (err) {
      toast.error(friendlyErrorMessage(err, '加载联系消息失败'))
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadContacts()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadContacts])

  const filtered = useMemo(() => {
    return contacts.filter(c => {
      if (readFilter === 'unread') return !c.isRead
      if (readFilter === 'read') return c.isRead
      return true
    })
  }, [contacts, readFilter])

  const handleToggleRead = useCallback(async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const target = contacts.find(c => c.id === id)
    if (!target || target.isRead) return
    try {
      await markContactRead(id)
      setContacts(prev => prev.map(c => c.id === id ? { ...c, isRead: true } : c))
    } catch (err) {
      toast.error(friendlyErrorMessage(err, '更新已读状态失败'))
    }
  }, [contacts, toast])

  const handleToggleExpand = useCallback((key: string) => {
    setExpandedId(prev => {
      const next = prev === key ? null : key
      if (next) {
        const target = contacts.find(c => c.id === key)
        if (target && !target.isRead) {
          markContactRead(key).then(() => {
            setContacts(p => p.map(c => c.id === key ? { ...c, isRead: true } : c))
          }).catch(err => toast.error(friendlyErrorMessage(err, '标记已读失败')))
        }
      }
      return next
    })
  }, [contacts, toast])

  const columns = useMemo<Column<AdminContact>[]>(() => [
    {
      key: 'status',
      title: '',
      width: '24px',
      render: row => (
        <span className={`acp-dot ${row.isRead ? 'acp-dot--read' : 'acp-dot--unread'}`} />
      ),
    },
    {
      key: 'name',
      title: '姓名',
      width: '120px',
      render: row => (
        <span className={`acp-name ${row.isRead ? '' : 'acp-name--unread'}`}>
          {row.name}
        </span>
      ),
    },
    {
      key: 'email',
      title: '邮箱',
      width: '200px',
      render: row => <span className="acp-email">{row.email}</span>,
    },
    {
      key: 'message',
      title: '消息内容',
      render: row => (
        <span className="acp-message-preview">
          {row.message.length > 80 ? `${row.message.slice(0, 80)}…` : row.message}
        </span>
      ),
    },
    {
      key: 'time',
      title: '提交时间',
      width: '110px',
      render: row => <span className="acp-time">{formatTime(row.createdAt)}</span>,
    },
    {
      key: 'actions',
      title: '操作',
      width: '100px',
      render: row => (
        <button
          className="acp-btn"
          onClick={e => handleToggleRead(row.id, e)}
        >
          {row.isRead ? '已读' : '标记已读'}
        </button>
      ),
    },
  ], [handleToggleRead])

  const renderExpanded = useCallback((row: AdminContact) => (
    <div className="acp-expand">
      <div className="acp-expand__header">
        <div className="acp-expand__sender">
          <span className="acp-expand__sender-name">{row.name}</span>
          <span className="acp-expand__sender-email">{row.email}</span>
          <span className="acp-expand__sender-time">{formatTime(row.createdAt)}</span>
        </div>
      </div>

      <div className="acp-expand__message">
        {row.message}
      </div>

    </div>
  ), [])

  return (
    <div className="acp">
      <h1 className="acp__title">Contacts</h1>

      <div className="acp__filters">
        <div className="acp__tabs">
          {readTabs.map(tab => (
            <button
              key={tab.value}
              className={`acp__tab ${readFilter === tab.value ? 'acp__tab--active' : ''}`}
              onClick={() => setReadFilter(tab.value)}
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
        emptyText="没有联系消息"
        expandedKey={expandedId}
        onToggleExpand={handleToggleExpand}
        renderExpanded={renderExpanded}
      />
    </div>
  )
}
