import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/auth/useAuth'
import { useToast } from '../../hooks/social/useToast'
import { fetchCaptcha } from '../../services/mockRuntime'
import './LoginPage.css'

function validateRegisterPassword(password: string): string | null {
  if (password.length < 8) return '密码至少 8 位'
  if (password.length > 72) return '密码过长'
  if (!/[A-Z]/.test(password)) return '需包含大写字母'
  if (!/[a-z]/.test(password)) return '需包含小写字母'
  if (!/[0-9]/.test(password)) return '需包含数字'
  return null
}

const CAPTCHA_LENGTH = 4

export default function LoginPage() {
  const leftEyeRef = useRef<HTMLDivElement>(null)
  const rightEyeRef = useRef<HTMLDivElement>(null)

  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 })
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isRegister, setIsRegister] = useState(false)

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [captchaInput, setCaptchaInput] = useState('')
  const [captchaId, setCaptchaId] = useState('')
  const [captchaImageSrc, setCaptchaImageSrc] = useState('')

  const { login, register, isAuthenticated, isLoading } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string })?.from || '/home'

  const generateCaptcha = useCallback(async () => {
    setCaptchaInput('')
    try {
      const res = await fetchCaptcha()
      setCaptchaId(res.captcha_id)
      setCaptchaImageSrc(res.image)
    } catch {
      toast.error('获取验证码失败，请稍后重试')
    }
  }, [toast])

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true })
  }, [isAuthenticated, navigate, from])

  const calcOffset = useCallback((el: HTMLDivElement | null, mx: number, my: number) => {
    if (!el) return { x: 0, y: 0 }
    const r = el.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const angle = Math.atan2(my - cy, mx - cx)
    const dist = Math.min(Math.hypot(mx - cx, my - cy) * 0.15, r.width * 0.22)
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist }
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (isPasswordFocused) return
      const l = calcOffset(leftEyeRef.current, e.clientX, e.clientY)
      const rr = calcOffset(rightEyeRef.current, e.clientX, e.clientY)
      setPupilOffset({ x: (l.x + rr.x) / 2, y: (l.y + rr.y) / 2 })
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [isPasswordFocused, calcOffset])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    if (isRegister) {
      if (!username.trim()) { toast.info('请输入用户名'); return }
      if (username.trim().length < 3) { toast.info('用户名至少 3 个字符'); return }
      if (!email.trim()) { toast.info('请输入邮箱'); return }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { toast.info('邮箱格式不正确'); return }
      if (!password.trim()) { toast.info('请输入密码'); return }
      const passwordError = validateRegisterPassword(password)
      if (passwordError) { toast.info(passwordError); return }
      if (!captchaInput.trim()) { toast.info('请输入验证码'); return }
      const result = await register(username.trim(), email.trim(), password, captchaId, captchaInput.trim())
      if (result.ok) {
        toast.success('注册成功')
        navigate(from, { replace: true })
      } else {
        toast.error(result.message ?? '注册失败，请检查输入后重试')
        generateCaptcha()
      }
    } else {
      if (!username.trim()) { toast.info('请输入用户名'); return }
      if (!password.trim()) { toast.info('请输入密码'); return }
      const result = await login(username.trim(), password)
      if (result.ok) {
        toast.success('登录成功')
        navigate(from, { replace: true })
      } else {
        toast.error(result.message ?? '用户名或密码错误')
      }
    }
  }, [isRegister, email, password, username, captchaInput, captchaId, login, register, toast, navigate, from, generateCaptcha])

  const pupilStyle = isPasswordFocused
    ? { transform: 'translate(0px, 16px) scale(0.75)' }
    : { transform: `translate(${pupilOffset.x}px, ${pupilOffset.y}px)` }

  const eyeToggleBtn = (
    <button
      type="button"
      className="lp-pw-toggle"
      onClick={() => setShowPassword(p => !p)}
      aria-label={showPassword ? 'Hide password' : 'Show password'}
      tabIndex={-1}
    >
      {showPassword ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  )

  const captchaBlock = (
    <div className="lp-captcha">
      {captchaImageSrc ? (
        <img
          src={captchaImageSrc}
          alt="验证码"
          className="lp-captcha-canvas"
          onClick={generateCaptcha}
          title="点击刷新验证码"
        />
      ) : (
        <div
          className="lp-captcha-canvas lp-captcha-placeholder"
          onClick={generateCaptcha}
          title="点击获取验证码"
        >
          加载中...
        </div>
      )}
      <input
        type="text"
        className="xo-input lp-input lp-captcha-input"
        placeholder="验证码"
        value={captchaInput}
        maxLength={CAPTCHA_LENGTH}
        onChange={e => setCaptchaInput(e.target.value)}
        autoComplete="off"
      />
    </div>
  )

  return (
    <div className="page page--login">
      <div className={`lp-card${isRegister ? ' lp-card--wide' : ''}`}>
        <div className="lp-eyes-section">
          <div className="lp-eyes-inner">
            <div className="lp-eye" ref={leftEyeRef}>
              <div className="lp-pupil" style={pupilStyle} />
              <div className={`lp-eyelid${isPasswordFocused ? ' lp-eyelid--shut' : ''}`} />
            </div>
            <div className="lp-eye" ref={rightEyeRef}>
              <div className="lp-pupil" style={pupilStyle} />
              <div className={`lp-eyelid${isPasswordFocused ? ' lp-eyelid--shut' : ''}`} />
            </div>
          </div>
        </div>

        <div className="lp-bottom">
          <form className="lp-form" onSubmit={handleSubmit} noValidate>
            {isRegister ? (
              <div className="lp-grid">
                <input
                  type="text"
                  className="xo-input lp-input"
                  placeholder="Username"
                  autoComplete="username"
                  maxLength={50}
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
                <input
                  type="email"
                  className="xo-input lp-input"
                  placeholder="Email"
                  autoComplete="email"
                  maxLength={100}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
                <div className="lp-pw-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="xo-input lp-input"
                    placeholder="Password"
                    autoComplete="new-password"
                    maxLength={72}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                  />
                  {eyeToggleBtn}
                </div>
                {captchaBlock}
              </div>
            ) : (
              <>
                <input
                  type="text"
                  className="xo-input lp-input"
                  placeholder="Username"
                  autoComplete="username"
                  maxLength={50}
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
                <div className="lp-pw-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="xo-input lp-input"
                    placeholder="Password"
                    autoComplete="current-password"
                    maxLength={72}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                  />
                  {eyeToggleBtn}
                </div>
              </>
            )}
            <button type="submit" className="xo-btn-primary lp-submit" disabled={isLoading}>
              {isLoading ? '...' : isRegister ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          <p className="lp-switch">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}
            <button
              type="button"
              className="lp-switch-btn"
              onClick={() => {
                if (!isRegister) generateCaptcha()
                setIsRegister(p => !p)
              }}
            >
              {isRegister ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
