import * as mockRuntime from './mockRuntime'
import * as realRuntime from './realRuntime'

export type {
  ActivityLog,
  ActivityType,
  AdminContact,
  AdminStats,
  AIDecision,
  ApiCaptchaResponseDto,
  FetchEssaysParams,
  FetchPostsParams,
  PaginationParams,
  ReviewContentType,
  ReviewedBy,
  ReviewItem,
  ReviewStatus,
} from './mockRuntime'

const runtime = import.meta.env.VITE_DATA_MODE === 'mock' ? mockRuntime : realRuntime

export const fetchCaptcha = runtime.fetchCaptcha
export const loginApi = runtime.loginApi
export const registerApi = runtime.registerApi
export const logoutApi = runtime.logoutApi
export const fetchCurrentUser = runtime.fetchCurrentUser
export const fetchMyLikes = runtime.fetchMyLikes
export const updateProfileApi = runtime.updateProfileApi
export const changePasswordApi = runtime.changePasswordApi
export const fetchPosts = runtime.fetchPosts
export const createPost = runtime.createPost
export const updatePost = runtime.updatePost
export const deletePost = runtime.deletePost
export const togglePostLike = runtime.togglePostLike
export const fetchComments = runtime.fetchComments
export const createComment = runtime.createComment
export const deleteComment = runtime.deleteComment
export const recordView = runtime.recordView
export const fetchRecommendations = runtime.fetchRecommendations
export const fetchEssays = runtime.fetchEssays
export const createEssay = runtime.createEssay
export const updateEssay = runtime.updateEssay
export const deleteEssay = runtime.deleteEssay
export const toggleEssayLike = runtime.toggleEssayLike
export const fetchUserProfile = runtime.fetchUserProfile
export const searchUsers = runtime.searchUsers
export const fetchAdminUsers = runtime.fetchAdminUsers
export const updateUserRole = runtime.updateUserRole
export const fetchAdminContacts = runtime.fetchAdminContacts
export const markContactRead = runtime.markContactRead
export const submitContact = runtime.submitContact
export const fetchAdminStats = runtime.fetchAdminStats
export const fetchAdminActivities = runtime.fetchAdminActivities
export const fetchAdminReviews = runtime.fetchAdminReviews
export const reviewApprove = runtime.reviewApprove
export const reviewReject = runtime.reviewReject
export const sendHeartbeat = runtime.sendHeartbeat
export const fetchOnlineCount = runtime.fetchOnlineCount
