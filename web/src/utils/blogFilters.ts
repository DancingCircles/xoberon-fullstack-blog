import type { BlogPost, BlogCategory } from '../assets/data/mockData'

export type BlogFilter = 'Latest' | 'Popular' | BlogCategory

/**
 * 按日期排序博客文章（最新的在前）
 */
export function sortPostsByDate(posts: BlogPost[], order: 'asc' | 'desc' = 'desc'): BlogPost[] {
  return [...posts].sort((a, b) => {
    const diff = new Date(b.date).getTime() - new Date(a.date).getTime()
    return order === 'desc' ? diff : -diff
  })
}

/**
 * 按点赞数排序博客文章（最多的在前）
 */
export function sortPostsByLikes(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort((a, b) => b.likes - a.likes)
}

/**
 * 按分类过滤博客文章
 */
export function filterPostsByCategory(posts: BlogPost[], category: string): BlogPost[] {
  return posts.filter(post => post.category === category)
}

/**
 * 搜索博客文章（搜索标题、内容和标签）
 */
export function searchPosts(posts: BlogPost[], query: string): BlogPost[] {
  if (!query.trim()) return posts
  
  const q = query.toLowerCase()
  return posts.filter(post => {
    const matchTitle = post.title.toLowerCase().includes(q)
    const matchContent = post.content.toLowerCase().includes(q)
    const matchTags = post.tags?.some(tag => tag.toLowerCase().includes(q))
    return matchTitle || matchContent || matchTags
  })
}

/**
 * 综合过滤和排序博客文章
 */
export function filterAndSortPosts(
  posts: BlogPost[],
  filter: string,
  searchQuery: string = ''
): BlogPost[] {
  let result = [...posts]

  // 1. 应用过滤（分类或特殊排序）
  if (filter === 'Latest') {
    result = sortPostsByDate(result, 'desc')
  } else if (filter === 'Popular') {
    result = sortPostsByLikes(result)
  } else {
    // 按具体分类过滤
    result = filterPostsByCategory(result, filter)
    result = sortPostsByDate(result, 'desc')
  }

  // 2. 应用搜索
  if (searchQuery) {
    result = searchPosts(result, searchQuery)
  }

  return result
}

/**
 * 计算分页数据
 */
export function paginatePosts<T>(
  posts: T[],
  currentPage: number,
  postsPerPage: number
): {
  currentPosts: T[]
  totalPages: number
  indexOfFirstPost: number
  indexOfLastPost: number
} {
  const safePage = Math.max(1, currentPage)
  const safePerPage = Math.max(1, postsPerPage)

  const indexOfLastPost = safePage * safePerPage
  const indexOfFirstPost = indexOfLastPost - safePerPage
  const currentPosts = posts.slice(indexOfFirstPost, indexOfLastPost)
  const totalPages = Math.ceil(posts.length / safePerPage)

  return {
    currentPosts,
    totalPages,
    indexOfFirstPost,
    indexOfLastPost
  }
}

/**
 * 从博客文章中提取唯一的分类列表
 */
export function extractUniqueCategories(posts: BlogPost[]): string[] {
  return [...new Set(posts.map(post => post.category))]
}

/**
 * 将扁平列表按行分组，超出部分轮询分配到已有行（确定性，无随机）。
 * 适用于 BlogList / AboutPage 的卡片行分组。
 */
export function groupIntoRows<T>(items: T[], cardsPerRow: number, maxRows: number): T[][] {
  const maxSlots = cardsPerRow * maxRows
  const directItems = items.slice(0, maxSlots)
  const overflowItems = items.slice(maxSlots)

  const rows: T[][] = []
  for (let i = 0; i < directItems.length; i += cardsPerRow) {
    rows.push(directItems.slice(i, i + cardsPerRow))
  }

  overflowItems.forEach((item, idx) => {
    if (rows.length === 0) return
    const rowIdx = idx % rows.length
    rows[rowIdx].push(item)
  })

  return rows
}

/**
 * 将新增项从行结果中取出，插入到指定行的第一个位置。
 * 配合 useRef 记录 {id -> rowIndex} 映射，避免重渲染时行号变化。
 */
export function relocateNewItem<T extends { id: string }>(
  rows: T[][],
  newItemId: string,
  targetRow: number,
): T[][] {
  if (rows.length === 0) return rows

  const result = rows.map(r => [...r])
  const safeRow = Math.min(targetRow, result.length - 1)

  let found: T | undefined
  for (let r = 0; r < result.length; r++) {
    const idx = result[r].findIndex(item => item.id === newItemId)
    if (idx !== -1) {
      found = result[r].splice(idx, 1)[0]
      break
    }
  }

  if (found) {
    result[safeRow].unshift(found)
  }

  return result
}
