import type { BlogCategory, BlogPost, Comment, EssayItem, UserProfile, UserRole } from '../assets/data/types'
import { api, clearAuthToken, setAuthToken } from './api'
import type {
  ActivityLog,
  AdminContact,
  AdminStats,
  ApiCaptchaResponseDto,
  FetchEssaysParams,
  FetchPostsParams,
  ReviewItem,
} from './mockRuntime'
import { resolveAvatarSrc } from '../utils/avatar'

interface PageResult<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

interface UserDto {
  id: string
  name: string
  handle: string
  bio: string
  avatar: string
  role: UserRole
  email?: string
  post_count?: number
  essay_count?: number
  created_at?: string
}

interface PostDto {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  created_at: string
  category: string
  tags: string[]
  read_time_minutes: number
  like_count: number
  author_name: string
  author_avatar: string
  author_handle: string
  comments?: CommentDto[]
}

interface EssayDto {
  id: string
  title: string
  excerpt: string
  content: string
  created_at: string
  like_count: number
  author_name: string
  author_avatar: string
  author_handle: string
}

interface CommentDto {
  id: string
  author_id: string
  author: string
  avatar: string
  created_at: string
  content: string
}

interface LikeDto {
  liked: boolean
  like_count: number
}

interface LoginDto {
  token: string
  user: UserDto
}

interface RecommendationDto {
  data: PostDto[]
}

interface AdminContactDto {
  id: string
  name: string
  email: string
  message: string
  is_read: boolean
  created_at: string
}

function buildQuery(params: Record<string, unknown> = {}): string {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    if (Array.isArray(value)) {
      value.forEach(item => query.append(key, String(item)))
      return
    }
    query.set(key, String(value))
  })
  const text = query.toString()
  return text ? `?${text}` : ''
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

function toUser(dto: UserDto): UserProfile {
  return {
    id: dto.id,
    name: dto.name,
    handle: dto.handle,
    avatar: resolveAvatarSrc(dto.avatar, dto.handle || dto.id || dto.name),
    bio: dto.bio,
    role: dto.role,
    postCount: dto.post_count ?? 0,
    essayCount: dto.essay_count ?? 0,
    email: dto.email,
    createdAt: dto.created_at,
  }
}

function toComment(dto: CommentDto): Comment {
  return {
    id: dto.id,
    authorId: dto.author_id,
    author: dto.author,
    avatar: resolveAvatarSrc(dto.avatar, dto.author_id || dto.author),
    date: formatDate(dto.created_at),
    content: dto.content,
  }
}

function toPost(dto: PostDto): BlogPost {
  return {
    id: dto.id,
    title: dto.title,
    excerpt: dto.excerpt,
    content: dto.content,
    date: formatDate(dto.created_at),
    category: dto.category as BlogCategory,
    slug: dto.slug,
    readTime: dto.read_time_minutes,
    tags: dto.tags ?? [],
    likes: dto.like_count,
    author: {
      name: dto.author_name,
      avatar: resolveAvatarSrc(dto.author_avatar, dto.author_handle || dto.author_name),
      handle: dto.author_handle,
    },
    comments: (dto.comments ?? []).map(toComment),
  }
}

function toEssay(dto: EssayDto): EssayItem {
  return {
    id: dto.id,
    title: dto.title,
    excerpt: dto.excerpt,
    content: dto.content,
    date: formatDate(dto.created_at),
    likes: dto.like_count,
    author: {
      name: dto.author_name,
      avatar: resolveAvatarSrc(dto.author_avatar, dto.author_handle || dto.author_name),
      handle: dto.author_handle,
    },
  }
}

function toReview(item: ReviewItem): ReviewItem {
  return {
    ...item,
    authorAvatar: resolveAvatarSrc(item.authorAvatar, item.authorName || item.contentId),
  }
}

function handlePath(handle: string): string {
  return encodeURIComponent(handle.replace(/^@/, ''))
}

export async function fetchCaptcha(): Promise<ApiCaptchaResponseDto> {
  return api.get<ApiCaptchaResponseDto>('/v1/auth/captcha')
}

export async function loginApi(
  username: string,
  password: string,
): Promise<{ token: string; user: UserProfile }> {
  const result = await api.post<LoginDto>('/v1/auth/login', { username, password })
  setAuthToken(result.token)
  return { token: result.token, user: toUser(result.user) }
}

export async function registerApi(
  username: string,
  email: string,
  password: string,
  name: string,
  captchaId: string,
  captchaCode: string,
): Promise<{ token: string; user: UserProfile }> {
  const result = await api.post<LoginDto>('/v1/auth/register', {
    username,
    email,
    password,
    name,
    captcha_id: captchaId,
    captcha_code: captchaCode,
  })
  setAuthToken(result.token)
  return { token: result.token, user: toUser(result.user) }
}

export async function fetchCurrentUser(): Promise<UserProfile> {
  return toUser(await api.get<UserDto>('/v1/users/me'))
}

export async function fetchMyLikes(): Promise<{ postIds: string[]; essayIds: string[] }> {
  const result = await api.get<{ post_ids: string[]; essay_ids: string[] }>('/v1/users/me/likes')
  return { postIds: result.post_ids ?? [], essayIds: result.essay_ids ?? [] }
}

export async function logoutApi(): Promise<void> {
  try {
    await api.post<void>('/v1/auth/logout', {})
  } finally {
    clearAuthToken()
  }
}

export async function updateProfileApi(
  data: { name: string; bio?: string; avatar?: string },
): Promise<UserProfile> {
  await api.put<UserDto>('/v1/users/me', data)
  return fetchCurrentUser()
}

export async function changePasswordApi(oldPassword: string, newPassword: string): Promise<void> {
  await api.put<void>('/v1/users/me/password', {
    old_password: oldPassword,
    new_password: newPassword,
  })
}

export async function fetchPosts(
  params?: FetchPostsParams,
): Promise<{ items: BlogPost[]; total: number }> {
  const result = await api.get<PageResult<PostDto>>(`/v1/posts${buildQuery({
    page: params?.page,
    page_size: params?.pageSize,
    category: params?.category,
    tag: params?.tag,
    keyword: params?.keyword,
    author_id: params?.authorId,
  })}`)
  return { items: result.items.map(toPost), total: result.total }
}

export async function createPost(data: {
  title: string
  content: string
  category: BlogPost['category']
  tags: string[]
}): Promise<BlogPost> {
  return toPost(await api.post<PostDto>('/v1/posts', data))
}

export async function updatePost(id: string, data: {
  title: string
  content: string
  category: BlogPost['category']
  tags: string[]
}): Promise<BlogPost> {
  return toPost(await api.put<PostDto>(`/v1/posts/${encodeURIComponent(id)}`, data))
}

export async function deletePost(id: string): Promise<void> {
  await api.delete<void>(`/v1/posts/${encodeURIComponent(id)}`)
}

export async function togglePostLike(
  id: string,
): Promise<{ liked: boolean; likeCount: number }> {
  const result = await api.post<LikeDto>(`/v1/posts/${encodeURIComponent(id)}/like`, {})
  return { liked: result.liked, likeCount: result.like_count }
}

export async function fetchComments(postId: string, params?: { page?: number; pageSize?: number }): Promise<{ items: Comment[]; total: number }> {
  const result = await api.get<PageResult<CommentDto>>(`/v1/posts/${encodeURIComponent(postId)}/comments${buildQuery({ page: params?.page, page_size: params?.pageSize })}`)
  return { items: result.items.map(toComment), total: result.total }
}

export async function createComment(postId: string, content: string): Promise<Comment> {
  return toComment(await api.post<CommentDto>(`/v1/posts/${encodeURIComponent(postId)}/comments`, { content }))
}

export async function deleteComment(postId: string, commentId: string): Promise<void> {
  await api.delete<void>(
    `/v1/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
  )
}

export async function recordView(postId: string): Promise<void> {
  await api.post<void>(`/v1/posts/${encodeURIComponent(postId)}/view`, {})
}

export async function fetchRecommendations(params?: {
  limit?: number
  exclude?: string[]
}): Promise<BlogPost[]> {
  const result = await api.get<RecommendationDto>(`/v1/posts/recommendations${buildQuery({
    limit: params?.limit,
    exclude: params?.exclude?.join(','),
  })}`)
  return result.data.map(toPost)
}

export async function fetchEssays(
  params?: FetchEssaysParams,
): Promise<{ items: EssayItem[]; total: number }> {
  const result = await api.get<PageResult<EssayDto>>(`/v1/essays${buildQuery({
    page: params?.page,
    page_size: params?.pageSize,
    keyword: params?.keyword,
    author_id: params?.authorId,
  })}`)
  return { items: result.items.map(toEssay), total: result.total }
}

export async function createEssay(data: {
  title: string
  excerpt: string
  content: string
}): Promise<EssayItem> {
  return toEssay(await api.post<EssayDto>('/v1/essays', data))
}

export async function updateEssay(id: string, data: {
  title: string
  excerpt: string
  content: string
}): Promise<EssayItem> {
  return toEssay(await api.put<EssayDto>(`/v1/essays/${encodeURIComponent(id)}`, data))
}

export async function deleteEssay(id: string): Promise<void> {
  await api.delete<void>(`/v1/essays/${encodeURIComponent(id)}`)
}

export async function toggleEssayLike(
  id: string,
): Promise<{ liked: boolean; likeCount: number }> {
  const result = await api.post<LikeDto>(`/v1/essays/${encodeURIComponent(id)}/like`, {})
  return { liked: result.liked, likeCount: result.like_count }
}

export async function fetchUserProfile(handle: string): Promise<UserProfile> {
  return toUser(await api.get<UserDto>(`/v1/users/${handlePath(handle)}`))
}

export async function searchUsers(query: string): Promise<UserProfile[]> {
  return (await api.get<UserDto[]>(`/v1/users${buildQuery({ q: query })}`)).map(toUser)
}

export async function fetchAdminUsers(
  params?: { page?: number; pageSize?: number },
): Promise<{ items: UserProfile[]; total: number }> {
  const result = await api.get<PageResult<UserDto>>(`/v1/admin/users${buildQuery({
    page: params?.page,
    page_size: params?.pageSize,
  })}`)
  return { items: result.items.map(toUser), total: result.total }
}

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  await api.put<UserDto>(`/v1/admin/users/${encodeURIComponent(userId)}/role`, { role })
}

export async function fetchAdminContacts(
  params?: { page?: number; pageSize?: number },
): Promise<{ items: AdminContact[]; total: number }> {
  const result = await api.get<PageResult<AdminContactDto>>(`/v1/admin/contacts${buildQuery({
    page: params?.page,
    page_size: params?.pageSize,
  })}`)
  return {
    items: result.items.map(item => ({
      id: item.id,
      name: item.name,
      email: item.email,
      message: item.message,
      isRead: item.is_read,
      createdAt: item.created_at,
    })),
    total: result.total,
  }
}

export async function markContactRead(contactId: string): Promise<void> {
  await api.put<void>(`/v1/admin/contacts/${encodeURIComponent(contactId)}/read`)
}

export async function submitContact(data: {
  name: string
  email: string
  message: string
  website?: string
}): Promise<void> {
  await api.post<void>('/v1/contact', data)
}

export async function fetchAdminStats(): Promise<AdminStats> {
  return api.get<AdminStats>('/v1/admin/stats')
}

export async function fetchAdminActivities(): Promise<ActivityLog[]> {
  return api.get<ActivityLog[]>('/v1/admin/activities')
}

export async function fetchAdminReviews(): Promise<ReviewItem[]> {
  return (await api.get<ReviewItem[]>('/v1/admin/reviews')).map(toReview)
}

export async function reviewApprove(id: string): Promise<void> {
  await api.put<void>(`/v1/admin/reviews/${encodeURIComponent(id)}/approve`)
}

export async function reviewReject(id: string, reason: string): Promise<void> {
  await api.put<void>(`/v1/admin/reviews/${encodeURIComponent(id)}/reject`, { reason })
}

export async function sendHeartbeat(): Promise<void> {
  await api.post<void>('/v1/heartbeat', {})
}

export async function fetchOnlineCount(): Promise<number> {
  const result = await api.get<{ count: number }>('/v1/admin/online-count')
  return result.count
}
