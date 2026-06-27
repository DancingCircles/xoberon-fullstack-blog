import type { BlogPost, Comment, EssayItem, UserProfile, UserRole } from '../assets/data/types'
import { blogPosts as seedPosts } from '../assets/data/blogPosts'
import { essays as seedEssays } from '../assets/data/essays'
import { users as seedUsers } from '../assets/data/users'
import { clearAuthToken, getAuthToken, setAuthToken } from './api'
import { avatarSrcFromKey, resolveAvatarSrc } from '../utils/avatar'

export interface PaginationParams {
  page?: number
  pageSize?: number
}

export interface FetchPostsParams extends PaginationParams {
  category?: string
  tag?: string
  keyword?: string
}

export interface FetchEssaysParams extends PaginationParams {
  keyword?: string
}

export interface ApiCaptchaResponseDto {
  captcha_id: string
  image: string
}

export interface AdminContact {
  id: string
  name: string
  email: string
  message: string
  isRead: boolean
  createdAt: string
}

export interface AdminStats {
  totalUsers: number
  totalPosts: number
  totalEssays: number
  pendingReviews: number
  unreadContacts: number
}

export type ActivityType =
  | 'new_post'
  | 'new_essay'
  | 'new_user'
  | 'new_contact'
  | 'review_approved'
  | 'review_rejected'

export interface ActivityLog {
  id: string
  type: ActivityType
  description: string
  operator: string
  createdAt: string
}

export type ReviewedBy = '' | 'ai' | 'admin'
export type AIDecision = '' | 'approve' | 'review' | 'reject'
export type ReviewStatus = 'pending' | 'approved' | 'rejected'
export type ReviewContentType = 'post' | 'essay' | 'comment'

export interface ReviewItem {
  id: string
  contentType: ReviewContentType
  contentId: string
  title: string
  excerpt: string
  fullContent: string
  authorName: string
  authorAvatar: string
  createdAt: string
  status: ReviewStatus
  aiDecision: AIDecision
  rejectReason?: string
  reviewedBy: ReviewedBy
  reviewedAt?: string
}

interface MockUserRecord extends UserProfile {
  email: string
  password: string
  createdAt: string
}

interface MockRuntimeState {
  version: number
  posts: BlogPost[]
  essays: EssayItem[]
  users: MockUserRecord[]
  contacts: AdminContact[]
  reviews: ReviewItem[]
  activities: ActivityLog[]
  heartbeats: Record<string, string>
}

const STATE_STORAGE_KEY = 'xoberon-mock-runtime'
const USER_STORAGE_KEY = 'xoberon-user'
const POST_LIKES_KEY = 'xoberon-liked-posts'
const ESSAY_LIKES_KEY = 'xoberon-liked-essays'
const CAPTCHA_STORAGE_KEY = 'xoberon-mock-captcha'
const DEFAULT_PASSWORD = 'Password123'
const VERSION = 3
const ONLINE_WINDOW_MS = 2 * 60 * 1000

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function normalizeHandle(value: string): string {
  return value.trim().replace(/^@/, '').toLowerCase()
}

function makeSlug(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || `post-${Date.now()}`
}

function stripMarkdown(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[#>*_[\]-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function excerptFromContent(content: string, fallbackLength = 120): string {
  const plain = stripMarkdown(content)
  if (!plain) return '暂无摘要'
  return plain.length > fallbackLength ? `${plain.slice(0, fallbackLength).trim()}...` : plain
}

function formatDisplayDate(date = new Date()): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

function nextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

function loadLikedIds(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set<string>()
  } catch {
    return new Set<string>()
  }
}

function currentStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as UserProfile) : null
  } catch {
    return null
  }
}

function currentUserOrThrow(state: MockRuntimeState): MockUserRecord {
  const user = currentStoredUser()
  const token = getAuthToken()
  if (!user || !token) {
    throw new Error('请先登录')
  }
  const match = state.users.find(item => item.id === user.id)
  if (!match) {
    throw new Error('当前用户不存在')
  }
  return match
}

function withDynamicCounts(state: MockRuntimeState, user: MockUserRecord): MockUserRecord {
  const postCount = state.posts.filter(post => post.author.handle === user.handle).length
  const essayCount = state.essays.filter(essay => essay.author.handle === user.handle).length
  return normalizeUserRecordAvatar({ ...user, postCount, essayCount })
}

function syncAuthorSnapshot<T extends { author: { name: string; avatar: string; handle: string } }>(
  items: T[],
  user: MockUserRecord,
): T[] {
  const avatar = resolveAvatarSrc(user.avatar, user.handle || user.id || user.name)
  return items.map(item =>
    item.author.handle === user.handle
      ? {
          ...item,
          author: {
            ...item.author,
            name: user.name,
            avatar,
            handle: user.handle,
          },
        }
      : item,
  )
}

function syncCommentAuthorSnapshot(posts: BlogPost[], user: MockUserRecord): BlogPost[] {
  const avatar = resolveAvatarSrc(user.avatar, user.handle || user.id || user.name)
  return posts.map(post => ({
    ...post,
    comments: post.comments.map(comment =>
      comment.authorId === user.id
        ? {
            ...comment,
            author: user.name,
            avatar,
          }
        : comment,
    ),
  }))
}

function normalizeUserRecordAvatar(user: MockUserRecord): MockUserRecord {
  return {
    ...user,
    avatar: resolveAvatarSrc(user.avatar, user.handle || user.id || user.name),
  }
}

function normalizePostAvatar(post: BlogPost): BlogPost {
  return {
    ...post,
    author: {
      ...post.author,
      avatar: resolveAvatarSrc(post.author.avatar, post.author.handle || post.author.name),
    },
    comments: post.comments.map(comment => ({
      ...comment,
      avatar: resolveAvatarSrc(comment.avatar, comment.authorId || comment.author),
    })),
  }
}

function normalizeEssayAvatar(essay: EssayItem): EssayItem {
  return {
    ...essay,
    author: {
      ...essay.author,
      avatar: resolveAvatarSrc(essay.author.avatar, essay.author.handle || essay.author.name),
    },
  }
}

function normalizeReviewAvatar(review: ReviewItem): ReviewItem {
  return {
    ...review,
    authorAvatar: resolveAvatarSrc(review.authorAvatar, review.authorName || review.contentId),
  }
}

function normalizeStateAvatars(state: MockRuntimeState): MockRuntimeState {
  return {
    ...state,
    posts: state.posts.map(normalizePostAvatar),
    essays: state.essays.map(normalizeEssayAvatar),
    users: state.users.map(normalizeUserRecordAvatar),
    reviews: state.reviews.map(normalizeReviewAvatar),
  }
}

function buildInitialUsers(): MockUserRecord[] {
  const seeded = new Map<string, MockUserRecord>()

  seedUsers.forEach((user, index) => {
    seeded.set(user.handle, {
      ...clone(user),
      avatar: resolveAvatarSrc(user.avatar, user.handle || user.name),
      email: user.email ?? `${normalizeHandle(user.handle)}@example.com`,
      password: DEFAULT_PASSWORD,
      createdAt: user.createdAt ?? new Date(Date.UTC(2025, index % 12, index + 1)).toISOString(),
    })
  })

  const authorSeed = [...seedPosts, ...seedEssays]
  authorSeed.forEach((item, index) => {
    if (seeded.has(item.author.handle)) {
      return
    }
    const handle = item.author.handle
    seeded.set(handle, {
      id: `mock-user-${normalizeHandle(handle)}`,
      name: item.author.name,
      handle,
      avatar: resolveAvatarSrc(item.author.avatar, handle),
      bio: `${item.author.name} 的公开主页演示数据。`,
      role: 'user',
      postCount: 0,
      essayCount: 0,
      email: `${normalizeHandle(handle)}@example.com`,
      password: DEFAULT_PASSWORD,
      createdAt: new Date(Date.UTC(2025, (index + 3) % 12, (index % 20) + 1)).toISOString(),
    })
  })

  return [...seeded.values()]
}

function buildInitialReviews(posts: BlogPost[], essays: EssayItem[]): ReviewItem[] {
  const now = new Date()
  const reviews: ReviewItem[] = []

  posts.slice(0, 6).forEach((post, index) => {
    const status: ReviewStatus = index === 0 ? 'pending' : 'approved'
    const aiDecision: AIDecision = index === 0 ? 'review' : 'approve'
    const reviewedBy: ReviewedBy = status === 'approved' ? 'ai' : ''
    reviews.push({
      id: `review-post-${post.id}`,
      contentType: 'post',
      contentId: post.id,
      title: post.title,
      excerpt: post.excerpt,
      fullContent: post.content,
      authorName: post.author.name,
      authorAvatar: post.author.avatar,
      createdAt: new Date(now.getTime() - index * 3600_000).toISOString(),
      status,
      aiDecision,
      reviewedBy,
      reviewedAt: status === 'approved' ? new Date(now.getTime() - index * 3500_000).toISOString() : undefined,
    })
  })

  essays.slice(0, 4).forEach((essay, index) => {
    const status: ReviewStatus = index === 0 ? 'pending' : 'approved'
    const aiDecision: AIDecision = index === 0 ? 'review' : 'approve'
    const reviewedBy: ReviewedBy = status === 'approved' ? 'ai' : ''
    reviews.push({
      id: `review-essay-${essay.id}`,
      contentType: 'essay',
      contentId: essay.id,
      title: essay.title,
      excerpt: essay.excerpt,
      fullContent: essay.content,
      authorName: essay.author.name,
      authorAvatar: essay.author.avatar,
      createdAt: new Date(now.getTime() - (index + 8) * 3600_000).toISOString(),
      status,
      aiDecision,
      reviewedBy,
      reviewedAt: status === 'approved' ? new Date(now.getTime() - (index + 8) * 3500_000).toISOString() : undefined,
    })
  })

  const firstComments = posts.flatMap(post =>
    post.comments.slice(0, 1).map(comment => ({ post, comment })),
  )

  firstComments.slice(0, 3).forEach(({ post, comment }, index) => {
    reviews.push({
      id: `review-comment-${comment.id}`,
      contentType: 'comment',
      contentId: comment.id,
      title: `评论：${post.title}`,
      excerpt: comment.content,
      fullContent: comment.content,
      authorName: comment.author,
      authorAvatar: comment.avatar,
      createdAt: new Date(now.getTime() - (index + 12) * 3600_000).toISOString(),
      status: index === 0 ? 'pending' : 'approved',
      aiDecision: index === 0 ? 'review' : 'approve',
      reviewedBy: index === 0 ? '' : 'ai',
      reviewedAt: index === 0 ? undefined : new Date(now.getTime() - (index + 12) * 3500_000).toISOString(),
    })
  })

  return reviews
}

function buildInitialActivities(): ActivityLog[] {
  const now = Date.now()
  const items: Array<{ type: ActivityType; description: string; operator: string; offset: number }> = [
    { type: 'new_user', description: '演示用户数据已初始化', operator: 'system', offset: 20 },
    { type: 'new_post', description: '博客演示内容已装载', operator: 'system', offset: 18 },
    { type: 'new_essay', description: '随笔演示内容已装载', operator: 'system', offset: 16 },
    { type: 'new_contact', description: '演示联系消息已同步', operator: 'system', offset: 12 },
    { type: 'review_approved', description: '部分内容已自动通过审核', operator: 'AI', offset: 6 },
  ]

  return items.map((item, index) => ({
    id: `activity-seed-${index + 1}`,
    type: item.type,
    description: item.description,
    operator: item.operator,
    createdAt: new Date(now - item.offset * 3600_000).toISOString(),
  }))
}

function createSeedState(): MockRuntimeState {
  const posts = clone(seedPosts).map(normalizePostAvatar)
  const essays = clone(seedEssays).map(normalizeEssayAvatar)
  return {
    version: VERSION,
    posts,
    essays,
    users: buildInitialUsers(),
    contacts: [
      {
        id: 'contact-seed-1',
        name: 'X',
        email: 'hello@example.com',
        message: '很喜欢这个站点的视觉语言，希望后续能看到更多关于设计与代码的内容。',
        isRead: false,
        createdAt: new Date(Date.now() - 5 * 3600_000).toISOString(),
      },
      {
        id: 'contact-seed-2',
        name: 'X',
        email: 'collab@example.com',
        message: '如果你愿意开源更多前端实现细节，我很想学习整体的动效组织方式。',
        isRead: true,
        createdAt: new Date(Date.now() - 28 * 3600_000).toISOString(),
      },
    ],
    reviews: buildInitialReviews(posts, essays),
    activities: buildInitialActivities(),
    heartbeats: {},
  }
}

function isValidStateShape(value: unknown): value is MockRuntimeState {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<MockRuntimeState>
  return (
    typeof candidate.version === 'number' &&
    Array.isArray(candidate.posts) &&
    Array.isArray(candidate.essays) &&
    Array.isArray(candidate.users) &&
    Array.isArray(candidate.contacts) &&
    Array.isArray(candidate.reviews) &&
    Array.isArray(candidate.activities) &&
    !!candidate.heartbeats &&
    typeof candidate.heartbeats === 'object'
  )
}

function shouldReseedState(state: MockRuntimeState): boolean {
  // Reseed broken or empty mock stores so preview pages do not stay blank.
  const hasNoContent = state.posts.length === 0 && state.essays.length === 0
  const hasNoUsers = state.users.length === 0
  return hasNoContent || hasNoUsers
}

function migrateState(parsed: unknown): MockRuntimeState {
  if (!isValidStateShape(parsed)) {
    return createSeedState()
  }

  if (shouldReseedState(parsed)) {
    return createSeedState()
  }

  return normalizeStateAvatars({
    ...parsed,
    version: VERSION,
    heartbeats: parsed.heartbeats ?? {},
  })
}

function loadState(): MockRuntimeState {
  const parsed = readJson<unknown>(STATE_STORAGE_KEY)
  const state = (!parsed || !isValidStateShape(parsed) || parsed.version !== VERSION || shouldReseedState(parsed))
    ? migrateState(parsed)
    : parsed

  if (!parsed || state !== parsed) {
    saveState(state)
  }

  return state
}

function saveState(state: MockRuntimeState) {
  writeJson(STATE_STORAGE_KEY, state)
}

function mutateState<T>(updater: (draft: MockRuntimeState) => T): T {
  const state = loadState()
  const result = updater(state)
  saveState(state)
  return result
}

function appendActivity(
  state: MockRuntimeState,
  type: ActivityType,
  description: string,
  operator: string,
) {
  state.activities.unshift({
    id: nextId('activity'),
    type,
    description,
    operator,
    createdAt: new Date().toISOString(),
  })
}

function paginate<T>(items: T[], params?: PaginationParams): { items: T[]; total: number } {
  const page = params?.page ?? 1
  const pageSize = params?.pageSize ?? (items.length || 1)
  const start = (page - 1) * pageSize
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
  }
}

function findUserByLogin(users: MockUserRecord[], identifier: string): MockUserRecord | undefined {
  const normalized = identifier.trim().toLowerCase()
  return users.find(user => {
    const handle = normalizeHandle(user.handle)
    return (
      user.email.toLowerCase() === normalized ||
      user.name.toLowerCase() === normalized ||
      handle === normalized
    )
  })
}

function persistCaptcha(code: string): ApiCaptchaResponseDto {
  const captchaId = nextId('captcha')
  writeJson(CAPTCHA_STORAGE_KEY, { id: captchaId, code })
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="132" height="44" viewBox="0 0 132 44">',
    '<rect width="132" height="44" rx="8" fill="#edead8"/>',
    '<text x="66" y="29" text-anchor="middle" font-size="24" font-family="monospace" fill="#2e333a" letter-spacing="6">',
    code,
    '</text>',
    '</svg>',
  ].join('')

  return {
    captcha_id: captchaId,
    image: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
  }
}

function validateCaptcha(captchaId: string, captchaCode: string): boolean {
  const cached = readJson<{ id: string; code: string }>(CAPTCHA_STORAGE_KEY)
  if (!cached) return false
  return cached.id === captchaId && cached.code.toLowerCase() === captchaCode.trim().toLowerCase()
}

function syncUserSnapshot(state: MockRuntimeState, user: MockUserRecord) {
  state.posts = syncAuthorSnapshot(state.posts, user)
  state.posts = syncCommentAuthorSnapshot(state.posts, user)
  state.essays = syncAuthorSnapshot(state.essays, user)
  state.reviews = state.reviews.map(review => {
    const normalizedReviewAuthor = normalizeHandle(review.authorName)
    return normalizedReviewAuthor === normalizeHandle(user.name) ||
      normalizeHandle(review.authorName) === normalizeHandle(user.handle)
      ? {
          ...review,
          authorName: user.name,
          authorAvatar: user.avatar,
        }
      : review
  })
}

export async function fetchCaptcha(): Promise<ApiCaptchaResponseDto> {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const code = Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
  return persistCaptcha(code)
}

export async function loginApi(
  username: string,
  password: string,
): Promise<{ token: string; user: UserProfile }> {
  const state = loadState()
  const user = findUserByLogin(state.users, username)
  if (!user || user.password !== password) {
    throw new Error('用户名或密码错误')
  }
  const hydrated = withDynamicCounts(state, user)
  const token = `mock-token-${hydrated.id}`
  setAuthToken(token)
  return { token, user: hydrated }
}

export async function registerApi(
  username: string,
  email: string,
  password: string,
  name: string,
  captchaId: string,
  captchaCode: string,
): Promise<{ token: string; user: UserProfile }> {
  if (!validateCaptcha(captchaId, captchaCode)) {
    throw new Error('验证码错误')
  }

  return mutateState(state => {
    const normalizedHandle = `@${normalizeHandle(username)}`
    if (state.users.some(user => normalizeHandle(user.handle) === normalizeHandle(username))) {
      throw new Error('用户名已存在')
    }
    if (state.users.some(user => user.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('邮箱已被占用')
    }

    const createdAt = new Date().toISOString()
    const user: MockUserRecord = {
      id: nextId('user'),
      name: name.trim() || username.trim(),
      handle: normalizedHandle,
      avatar: avatarSrcFromKey(normalizedHandle),
      bio: '这是一个本地 mock 账号，可用于体验公开版站点的交互流程。',
      role: 'user',
      postCount: 0,
      essayCount: 0,
      email: email.trim(),
      password,
      createdAt,
    }

    state.users.unshift(user)
    appendActivity(state, 'new_user', `${user.name} 完成了本地注册`, user.name)
    const token = `mock-token-${user.id}`
    setAuthToken(token)
    return { token, user: withDynamicCounts(state, user) }
  })
}

export async function logoutApi(): Promise<void> {
  clearAuthToken()
}

export async function updateProfileApi(
  data: { name: string; bio?: string; avatar?: string },
): Promise<UserProfile> {
  return mutateState(state => {
    const current = currentUserOrThrow(state)
    const nextUser: MockUserRecord = {
      ...current,
      name: data.name.trim() || current.name,
      bio: data.bio?.trim() || current.bio,
      avatar: resolveAvatarSrc(data.avatar?.trim() || current.avatar, current.handle || current.id || current.name),
    }
    state.users = state.users.map(user => (user.id === current.id ? nextUser : user))
    syncUserSnapshot(state, nextUser)
    appendActivity(state, 'new_user', `${nextUser.name} 更新了个人资料`, nextUser.name)
    return withDynamicCounts(state, nextUser)
  })
}

export async function changePasswordApi(oldPassword: string, newPassword: string): Promise<void> {
  mutateState(state => {
    const current = currentUserOrThrow(state)
    if (current.password !== oldPassword) {
      throw new Error('旧密码不正确')
    }
    state.users = state.users.map(user =>
      user.id === current.id ? { ...user, password: newPassword } : user,
    )
  })
}

export async function fetchPosts(
  params?: FetchPostsParams,
): Promise<{ items: BlogPost[]; total: number }> {
  const state = loadState()
  let items = [...state.posts]

  if (params?.category) {
    items = items.filter(post => post.category === params.category)
  }
  if (params?.tag) {
    const needle = params.tag.toLowerCase()
    items = items.filter(post => post.tags.some(tag => tag.toLowerCase() === needle))
  }
  if (params?.keyword) {
    const keyword = params.keyword.toLowerCase().trim()
    items = items.filter(post =>
      post.title.toLowerCase().includes(keyword) ||
      post.excerpt.toLowerCase().includes(keyword) ||
      post.content.toLowerCase().includes(keyword) ||
      post.author.name.toLowerCase().includes(keyword) ||
      post.tags.some(tag => tag.toLowerCase().includes(keyword)),
    )
  }

  return paginate(items, params)
}

export async function createPost(data: {
  title: string
  content: string
  category: BlogPost['category']
  tags: string[]
}): Promise<BlogPost> {
  return mutateState(state => {
    const user = currentUserOrThrow(state)
    const userAvatar = resolveAvatarSrc(user.avatar, user.handle || user.id || user.name)
    const post: BlogPost = {
      id: nextId('post'),
      title: data.title.trim(),
      excerpt: excerptFromContent(data.content),
      content: data.content.trim(),
      date: formatDisplayDate(),
      category: data.category,
      slug: makeSlug(data.title),
      readTime: Math.max(1, Math.ceil(stripMarkdown(data.content).length / 280)),
      tags: data.tags,
      likes: 0,
      author: {
        name: user.name,
        avatar: userAvatar,
        handle: user.handle,
      },
      comments: [],
    }

    state.posts.unshift(post)
    state.reviews.unshift({
      id: nextId('review'),
      contentType: 'post',
      contentId: post.id,
      title: post.title,
      excerpt: post.excerpt,
      fullContent: post.content,
      authorName: user.name,
      authorAvatar: userAvatar,
      createdAt: new Date().toISOString(),
      status: 'pending',
      aiDecision: 'review',
      reviewedBy: '',
    })
    appendActivity(state, 'new_post', `${user.name} 发布了一篇新文章`, user.name)
    return post
  })
}

export async function deletePost(id: string): Promise<void> {
  mutateState(state => {
    const post = state.posts.find(item => item.id === id)
    state.posts = state.posts.filter(item => item.id !== id)
    state.reviews = state.reviews.filter(review => !(review.contentType === 'post' && review.contentId === id))
    if (post) {
      appendActivity(state, 'review_rejected', `${post.title} 已从公开列表移除`, 'system')
    }
  })
}

export async function togglePostLike(
  id: string,
): Promise<{ liked: boolean; likeCount: number }> {
  return mutateState(state => {
    const liked = loadLikedIds(POST_LIKES_KEY).has(id)
    let likeCount = 0
    state.posts = state.posts.map(post => {
      if (post.id !== id) return post
      likeCount = Math.max(0, post.likes + (liked ? 1 : -1))
      return { ...post, likes: likeCount }
    })
    return { liked, likeCount }
  })
}

export async function fetchComments(postId: string): Promise<Comment[]> {
  const state = loadState()
  return state.posts.find(post => post.id === postId)?.comments ?? []
}

export async function createComment(postId: string, content: string): Promise<Comment> {
  return mutateState(state => {
    const user = currentUserOrThrow(state)
    const userAvatar = resolveAvatarSrc(user.avatar, user.handle || user.id || user.name)
    const comment: Comment = {
      id: nextId('comment'),
      authorId: user.id,
      author: user.name,
      avatar: userAvatar,
      date: formatDisplayDate(),
      content: content.trim(),
    }

    state.posts = state.posts.map(post =>
      post.id === postId
        ? { ...post, comments: [...post.comments, comment] }
        : post,
    )

    const post = state.posts.find(item => item.id === postId)
    state.reviews.unshift({
      id: nextId('review'),
      contentType: 'comment',
      contentId: comment.id,
      title: `评论：${post?.title ?? '文章'}`,
      excerpt: comment.content,
      fullContent: comment.content,
      authorName: user.name,
      authorAvatar: userAvatar,
      createdAt: new Date().toISOString(),
      status: 'pending',
      aiDecision: 'review',
      reviewedBy: '',
    })
    return comment
  })
}

export async function deleteComment(postId: string, commentId: string): Promise<void> {
  mutateState(state => {
    state.posts = state.posts.map(post =>
      post.id === postId
        ? { ...post, comments: post.comments.filter(comment => comment.id !== commentId) }
        : post,
    )
    state.reviews = state.reviews.filter(
      review => !(review.contentType === 'comment' && review.contentId === commentId),
    )
  })
}

export async function recordView(_postId: string): Promise<void> {
  return
}

export async function fetchRecommendations(params?: {
  limit?: number
  exclude?: string[]
}): Promise<BlogPost[]> {
  const state = loadState()
  const excluded = new Set(params?.exclude ?? [])
  const sorted = [...state.posts]
    .filter(post => !excluded.has(post.id))
    .sort((a, b) => b.likes - a.likes)
  return sorted.slice(0, params?.limit ?? 5)
}

export async function fetchEssays(
  params?: FetchEssaysParams,
): Promise<{ items: EssayItem[]; total: number }> {
  const state = loadState()
  let items = [...state.essays]

  if (params?.keyword) {
    const keyword = params.keyword.toLowerCase().trim()
    items = items.filter(essay =>
      essay.title.toLowerCase().includes(keyword) ||
      essay.excerpt.toLowerCase().includes(keyword) ||
      essay.content.toLowerCase().includes(keyword) ||
      essay.author.name.toLowerCase().includes(keyword),
    )
  }

  return paginate(items, params)
}

export async function createEssay(data: {
  title: string
  excerpt: string
  content: string
}): Promise<EssayItem> {
  return mutateState(state => {
    const user = currentUserOrThrow(state)
    const userAvatar = resolveAvatarSrc(user.avatar, user.handle || user.id || user.name)
    const essay: EssayItem = {
      id: nextId('essay'),
      title: data.title.trim(),
      excerpt: data.excerpt.trim() || excerptFromContent(data.content, 60),
      content: data.content.trim(),
      date: formatDisplayDate(),
      likes: 0,
      author: {
        name: user.name,
        avatar: userAvatar,
        handle: user.handle,
      },
    }

    state.essays.unshift(essay)
    state.reviews.unshift({
      id: nextId('review'),
      contentType: 'essay',
      contentId: essay.id,
      title: essay.title,
      excerpt: essay.excerpt,
      fullContent: essay.content,
      authorName: user.name,
      authorAvatar: userAvatar,
      createdAt: new Date().toISOString(),
      status: 'pending',
      aiDecision: 'review',
      reviewedBy: '',
    })
    appendActivity(state, 'new_essay', `${user.name} 发布了一则新随笔`, user.name)
    return essay
  })
}

export async function deleteEssay(id: string): Promise<void> {
  mutateState(state => {
    const essay = state.essays.find(item => item.id === id)
    state.essays = state.essays.filter(item => item.id !== id)
    state.reviews = state.reviews.filter(review => !(review.contentType === 'essay' && review.contentId === id))
    if (essay) {
      appendActivity(state, 'review_rejected', `${essay.title} 已从公开列表移除`, 'system')
    }
  })
}

export async function toggleEssayLike(
  id: string,
): Promise<{ liked: boolean; likeCount: number }> {
  return mutateState(state => {
    const liked = loadLikedIds(ESSAY_LIKES_KEY).has(id)
    let likeCount = 0
    state.essays = state.essays.map(essay => {
      if (essay.id !== id) return essay
      likeCount = Math.max(0, essay.likes + (liked ? 1 : -1))
      return { ...essay, likes: likeCount }
    })
    return { liked, likeCount }
  })
}

export async function fetchUserProfile(handle: string): Promise<UserProfile> {
  const state = loadState()
  const normalized = normalizeHandle(handle)
  const user = state.users.find(item => normalizeHandle(item.handle) === normalized)
  if (!user) {
    throw new Error('用户不存在')
  }
  return withDynamicCounts(state, user)
}

export async function searchUsers(query: string): Promise<UserProfile[]> {
  const state = loadState()
  const normalized = query.trim().toLowerCase()
  if (!normalized) return []
  return state.users
    .map(user => withDynamicCounts(state, user))
    .filter(user =>
      user.name.toLowerCase().includes(normalized) ||
      user.handle.toLowerCase().includes(normalized) ||
      user.bio.toLowerCase().includes(normalized) ||
      (user.email ?? '').toLowerCase().includes(normalized),
    )
}

export async function fetchAdminUsers(
  params?: PaginationParams,
): Promise<{ items: UserProfile[]; total: number }> {
  const state = loadState()
  const users = state.users
    .map(user => withDynamicCounts(state, user))
    .sort((a, b) => {
      const aRole = a.role === 'owner' ? 0 : a.role === 'admin' ? 1 : 2
      const bRole = b.role === 'owner' ? 0 : b.role === 'admin' ? 1 : 2
      return aRole - bRole
    })
  return paginate(users, params)
}

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  mutateState(state => {
    state.users = state.users.map(user =>
      user.id === userId && user.role !== 'owner'
        ? { ...user, role }
        : user,
    )
    appendActivity(state, 'review_approved', `用户权限已调整为 ${role}`, 'admin')
  })
}

export async function fetchAdminContacts(
  params?: PaginationParams,
): Promise<{ items: AdminContact[]; total: number }> {
  const state = loadState()
  const contacts = [...state.contacts].sort((a, b) => {
    if (a.isRead !== b.isRead) return a.isRead ? 1 : -1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
  return paginate(contacts, params)
}

export async function markContactRead(contactId: string): Promise<void> {
  mutateState(state => {
    state.contacts = state.contacts.map(contact =>
      contact.id === contactId ? { ...contact, isRead: true } : contact,
    )
  })
}

export async function submitContact(data: {
  name: string
  email: string
  message: string
}): Promise<void> {
  mutateState(state => {
    state.contacts.unshift({
      id: nextId('contact'),
      name: data.name.trim(),
      email: data.email.trim(),
      message: data.message.trim(),
      isRead: false,
      createdAt: new Date().toISOString(),
    })
    appendActivity(state, 'new_contact', `收到来自 ${data.name.trim()} 的新联系消息`, data.name.trim())
  })
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const state = loadState()
  const onlineCount = await fetchOnlineCount()
  return {
    totalUsers: state.users.length,
    totalPosts: state.posts.length,
    totalEssays: state.essays.length,
    pendingReviews: state.reviews.filter(review => review.status === 'pending').length,
    unreadContacts: state.contacts.filter(contact => !contact.isRead).length + onlineCount * 0,
  }
}

export async function fetchAdminActivities(): Promise<ActivityLog[]> {
  const state = loadState()
  return [...state.activities].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

export async function fetchAdminReviews(): Promise<ReviewItem[]> {
  const state = loadState()
  return [...state.reviews].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

export async function reviewApprove(id: string): Promise<void> {
  mutateState(state => {
    const target = state.reviews.find(review => review.id === id)
    state.reviews = state.reviews.map(review =>
      review.id === id
        ? {
            ...review,
            status: 'approved',
            reviewedBy: 'admin',
            reviewedAt: new Date().toISOString(),
            rejectReason: undefined,
          }
        : review,
    )
    if (target) {
      appendActivity(state, 'review_approved', `${target.title} 已通过审核`, 'admin')
    }
  })
}

export async function reviewReject(id: string, reason: string): Promise<void> {
  mutateState(state => {
    const target = state.reviews.find(review => review.id === id)
    if (!target) {
      return
    }

    state.reviews = state.reviews.map(review =>
      review.id === id
        ? {
            ...review,
            status: 'rejected',
            reviewedBy: 'admin',
            reviewedAt: new Date().toISOString(),
            rejectReason: reason.trim(),
          }
        : review,
    )

    if (target.contentType === 'post') {
      state.posts = state.posts.filter(post => post.id !== target.contentId)
    } else if (target.contentType === 'essay') {
      state.essays = state.essays.filter(essay => essay.id !== target.contentId)
    } else if (target.contentType === 'comment') {
      state.posts = state.posts.map(post => ({
        ...post,
        comments: post.comments.filter(comment => comment.id !== target.contentId),
      }))
    }

    appendActivity(state, 'review_rejected', `${target.title} 已被删除`, 'admin')
  })
}

export async function sendHeartbeat(): Promise<void> {
  mutateState(state => {
    const user = currentStoredUser()
    if (!user) return
    state.heartbeats[user.id] = new Date().toISOString()
  })
}

export async function fetchOnlineCount(): Promise<number> {
  const state = loadState()
  const now = Date.now()
  return Object.values(state.heartbeats).filter(timestamp => {
    const value = new Date(timestamp).getTime()
    return Number.isFinite(value) && now - value <= ONLINE_WINDOW_MS
  }).length
}
