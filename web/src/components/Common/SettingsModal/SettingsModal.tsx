import { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { useBodyScrollLock } from '../../../hooks/scroll/useBodyScrollLock'
import { useToast } from '../../../hooks/social/useToast'
import { useAuth } from '../../../hooks/auth/useAuth'
import { changePasswordApi } from '../../../services/mockRuntime'
import { friendlyErrorMessage } from '../../../services/api'
import './SettingsModal.css'

type SettingsSection = 'profile' | 'account'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()

  const [section, setSection] = useState<SettingsSection>('profile')
  const [nickname, setNickname] = useState(currentUser?.name ?? '')
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar ?? '')
  const [oldPassword, setOldPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [isSavingPwd, setIsSavingPwd] = useState(false)

  const { toast } = useToast()
  const overlayRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const mouseDownTargetRef = useRef<EventTarget | null>(null)

  useBodyScrollLock(isOpen)

  const handleClose = useCallback(() => {
    const tl = gsap.timeline({ onComplete: onClose })
    tl.to(panelRef.current, {
      opacity: 0,
      scale: 0.95,
      y: 12,
      duration: 0.25,
      ease: 'power2.in',
    }).to(overlayRef.current, {
      opacity: 0,
      duration: 0.15,
    }, '-=0.1')
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return
    gsap.set(overlayRef.current, { opacity: 0 })
    gsap.set(panelRef.current, { opacity: 0, scale: 0.95, y: 12 })

    const tl = gsap.timeline()
    tl.to(overlayRef.current, {
      opacity: 1,
      duration: 0.25,
      ease: 'power2.out',
    }).to(panelRef.current, {
      opacity: 1,
      scale: 1,
      y: 0,
      duration: 0.35,
      ease: 'back.out(1.2)',
    }, '-=0.1')

    return () => { tl.kill() }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, handleClose])

  const showToast = useCallback((msg: string) => {
    toast.info(msg)
  }, [toast])

  const handleSavePassword = useCallback(async () => {
    if (!oldPassword) { showToast('请输入旧密码'); return }
    if (!password) { showToast('请输入新密码'); return }
    if (password !== confirmPwd) { showToast('两次密码不一致'); return }
    if (password.length < 8) { showToast('密码至少 8 位'); return }
    if (!/[A-Z]/.test(password)) { showToast('需包含大写字母'); return }
    if (!/[a-z]/.test(password)) { showToast('需包含小写字母'); return }
    if (!/[0-9]/.test(password)) { showToast('需包含数字'); return }

    setIsSavingPwd(true)
    try {
      await changePasswordApi(oldPassword, password)
      setOldPassword('')
      setPassword('')
      setConfirmPwd('')
      toast.success('密码已修改')
    } catch (err) {
      toast.error(friendlyErrorMessage(err, '修改密码失败'))
    } finally {
      setIsSavingPwd(false)
    }
  }, [oldPassword, password, confirmPwd, showToast, toast])

  const handleLogout = useCallback(async () => {
    await logout()
    showToast('已退出登录')
    timerRef.current = setTimeout(() => {
      handleClose()
      navigate('/home')
    }, 800)
  }, [handleClose, showToast, logout, navigate])

  useEffect(() => {
    return () => clearTimeout(timerRef.current)
  }, [])

  const handleAvatarClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast('请选择图片文件')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result)
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [showToast])

  if (!isOpen) return null

  return createPortal(
    <div
      className="settings-overlay"
      ref={overlayRef}
      onMouseDown={e => { mouseDownTargetRef.current = e.target }}
      onClick={e => { if (e.target === overlayRef.current && mouseDownTargetRef.current === overlayRef.current) handleClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div
        className="settings-panel"
        ref={panelRef}
        onClick={e => e.stopPropagation()}
      >
        <button className="settings-close" onClick={handleClose} aria-label="Close settings">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Left nav */}
        <nav className="settings-nav">
          <h2 className="settings-nav-title">Settings</h2>

          <button
            className={`settings-nav-item ${section === 'profile' ? 'settings-nav-item--active' : ''}`}
            onClick={() => setSection('profile')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            个人资料
          </button>

          <hr className="settings-nav-divider" />

          <button
            className={`settings-nav-item ${section === 'account' ? 'settings-nav-item--active' : ''}`}
            onClick={() => setSection('account')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            账号管理
          </button>
        </nav>

        {/* Right content */}
        <div className="settings-content">
          {section === 'profile' && (
            <>
              <h3 className="settings-section-title">个人资料</h3>

              <div className="settings-avatar-row">
                <img
                  className="settings-avatar-preview"
                  src={avatarUrl || 'https://i.pravatar.cc/150?u=default'}
                  alt="Avatar preview"
                />
                <button className="settings-avatar-btn" onClick={handleAvatarClick}>
                  上传头像
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>

              <div className="settings-field">
                <label className="settings-label" htmlFor="settings-nickname">昵称</label>
                <input
                  id="settings-nickname"
                  className="xo-input settings-input"
                  type="text"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="输入昵称"
                  maxLength={20}
                />
              </div>

            </>
          )}

          {section === 'account' && (
            <>
              <h3 className="settings-section-title">账号管理</h3>

              <div className="settings-field">
                <label className="settings-label" htmlFor="settings-old-pwd">旧密码</label>
                <input
                  id="settings-old-pwd"
                  className="xo-input settings-input"
                  type="password"
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  placeholder="输入当前密码"
                  maxLength={30}
                  autoComplete="current-password"
                />
              </div>

              <div className="settings-field">
                <label className="settings-label" htmlFor="settings-password">新密码</label>
                <input
                  id="settings-password"
                  className="xo-input settings-input"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="输入新密码（至少 8 位，含大小写和数字）"
                  maxLength={30}
                  autoComplete="new-password"
                />
              </div>

              <div className="settings-field">
                <label className="settings-label" htmlFor="settings-confirm-pwd">确认密码</label>
                <input
                  id="settings-confirm-pwd"
                  className="xo-input settings-input"
                  type="password"
                  value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)}
                  placeholder="再次输入新密码"
                  maxLength={30}
                  autoComplete="new-password"
                />
              </div>

              <button
                className="xo-btn-primary settings-save-btn"
                onClick={handleSavePassword}
                disabled={!oldPassword || !password || isSavingPwd}
              >
                {isSavingPwd ? '修改中...' : '修改密码'}
              </button>

              <hr className="settings-divider" />

              <div className="settings-actions-group">
                <button className="settings-action-btn settings-action-btn--danger" onClick={handleLogout}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  退出登录
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>,
    document.body
  )
}
