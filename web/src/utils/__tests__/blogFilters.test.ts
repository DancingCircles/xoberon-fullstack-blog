import { describe, it, expect } from 'vitest'
import type { BlogPost } from '../../assets/data/types'
import {
  sortPostsByDate,
  sortPostsByLikes,
  filterPostsByCategory,
  searchPosts,
  filterAndSortPosts,
  paginatePosts,
  extractUniqueCategories,
  groupIntoRows,
} from '../blogFilters'

function makePost(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    id: '1',
    title: 'Default Title',
    excerpt: 'Excerpt',
    content: 'Some content',
    date: '2025-06-15',
    category: 'Tech',
    slug: 'default',
    readTime: 3,
    tags: ['test'],
    likes: 10,
    author: { name: 'X', avatar: '', handle: '@x' },
    comments: [],
    ...overrides,
  }
}

// ─── sortPostsByDate ────────────────────────────────────────────────

describe('sortPostsByDate', () => {
  const older = makePost({ id: 'a', date: '2025-01-01' })
  const newer = makePost({ id: 'b', date: '2025-12-01' })
  const mid = makePost({ id: 'c', date: '2025-06-01' })

  it('默认按日期降序排列（最新在前）', () => {
    const result = sortPostsByDate([older, mid, newer])
    expect(result.map(p => p.id)).toEqual(['b', 'c', 'a'])
  })

  it('指定升序时最旧在前', () => {
    const result = sortPostsByDate([older, mid, newer], 'asc')
    expect(result.map(p => p.id)).toEqual(['a', 'c', 'b'])
  })

  it('空数组返回空', () => {
    expect(sortPostsByDate([])).toEqual([])
  })

  it('不修改原数组', () => {
    const arr = [newer, older]
    sortPostsByDate(arr)
    expect(arr[0].id).toBe('b')
  })
})

// ─── sortPostsByLikes ───────────────────────────────────────────────

describe('sortPostsByLikes', () => {
  it('按 likes 降序排列', () => {
    const low = makePost({ id: 'a', likes: 5 })
    const high = makePost({ id: 'b', likes: 100 })
    const mid = makePost({ id: 'c', likes: 50 })
    const result = sortPostsByLikes([low, mid, high])
    expect(result.map(p => p.id)).toEqual(['b', 'c', 'a'])
  })

  it('空数组返回空', () => {
    expect(sortPostsByLikes([])).toEqual([])
  })
})

// ─── filterPostsByCategory ──────────────────────────────────────────

describe('filterPostsByCategory', () => {
  const tech = makePost({ id: 'a', category: 'Tech' })
  const design = makePost({ id: 'b', category: 'Design' })
  const culture = makePost({ id: 'c', category: 'Culture' })

  it('只返回匹配分类的文章', () => {
    const result = filterPostsByCategory([tech, design, culture], 'Design')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('b')
  })

  it('不匹配时返回空数组', () => {
    expect(filterPostsByCategory([tech], 'Culture')).toEqual([])
  })

  it('空数组返回空', () => {
    expect(filterPostsByCategory([], 'Tech')).toEqual([])
  })
})

// ─── searchPosts ────────────────────────────────────────────────────

describe('searchPosts', () => {
  const posts = [
    makePost({ id: 'a', title: 'React Hooks Guide', content: 'Learn hooks', tags: ['react', 'hooks'] }),
    makePost({ id: 'b', title: 'CSS Grid', content: 'Grid layout', tags: ['css'] }),
    makePost({ id: 'c', title: 'TypeScript Tips', content: 'Advanced TS', tags: ['typescript'] }),
  ]

  it('搜索标题匹配', () => {
    const result = searchPosts(posts, 'React')
    expect(result.map(p => p.id)).toEqual(['a'])
  })

  it('搜索内容匹配', () => {
    const result = searchPosts(posts, 'Grid layout')
    expect(result.map(p => p.id)).toEqual(['b'])
  })

  it('搜索标签匹配', () => {
    const result = searchPosts(posts, 'typescript')
    expect(result.map(p => p.id)).toEqual(['c'])
  })

  it('大小写不敏感', () => {
    const result = searchPosts(posts, 'react')
    expect(result.map(p => p.id)).toEqual(['a'])
  })

  it('空查询返回全部', () => {
    expect(searchPosts(posts, '')).toHaveLength(3)
    expect(searchPosts(posts, '   ')).toHaveLength(3)
  })

  it('无匹配返回空', () => {
    expect(searchPosts(posts, 'nonexistent')).toEqual([])
  })
})

// ─── filterAndSortPosts ─────────────────────────────────────────────

describe('filterAndSortPosts', () => {
  const posts = [
    makePost({ id: 'a', date: '2025-01-01', likes: 5, category: 'Tech' }),
    makePost({ id: 'b', date: '2025-12-01', likes: 100, category: 'Design' }),
    makePost({ id: 'c', date: '2025-06-01', likes: 50, category: 'Tech', title: 'Special' }),
  ]

  it('Latest 模式按日期降序', () => {
    const result = filterAndSortPosts(posts, 'Latest')
    expect(result.map(p => p.id)).toEqual(['b', 'c', 'a'])
  })

  it('Popular 模式按 likes 降序', () => {
    const result = filterAndSortPosts(posts, 'Popular')
    expect(result.map(p => p.id)).toEqual(['b', 'c', 'a'])
  })

  it('分类模式只返回该分类并按日期排序', () => {
    const result = filterAndSortPosts(posts, 'Tech')
    expect(result.map(p => p.id)).toEqual(['c', 'a'])
  })

  it('同时应用搜索', () => {
    const result = filterAndSortPosts(posts, 'Tech', 'Special')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('c')
  })
})

// ─── paginatePosts ──────────────────────────────────────────────────

describe('paginatePosts', () => {
  const items = Array.from({ length: 10 }, (_, i) => i + 1)

  it('正常分页', () => {
    const r = paginatePosts(items, 1, 3)
    expect(r.currentPosts).toEqual([1, 2, 3])
    expect(r.totalPages).toBe(4)
    expect(r.indexOfFirstPost).toBe(0)
    expect(r.indexOfLastPost).toBe(3)
  })

  it('第二页', () => {
    const r = paginatePosts(items, 2, 3)
    expect(r.currentPosts).toEqual([4, 5, 6])
  })

  it('最后一页可能不满', () => {
    const r = paginatePosts(items, 4, 3)
    expect(r.currentPosts).toEqual([10])
  })

  it('页码为 0 或负数时安全回退到第一页', () => {
    const r = paginatePosts(items, 0, 3)
    expect(r.currentPosts).toEqual([1, 2, 3])
  })

  it('postsPerPage 为 0 时安全回退', () => {
    const r = paginatePosts(items, 1, 0)
    expect(r.currentPosts).toEqual([1])
    expect(r.totalPages).toBe(10)
  })

  it('空数组', () => {
    const r = paginatePosts([], 1, 5)
    expect(r.currentPosts).toEqual([])
    expect(r.totalPages).toBe(0)
  })
})

// ─── extractUniqueCategories ────────────────────────────────────────

describe('extractUniqueCategories', () => {
  it('提取并去重分类', () => {
    const posts = [
      makePost({ category: 'Tech' }),
      makePost({ category: 'Design' }),
      makePost({ category: 'Tech' }),
    ]
    const cats = extractUniqueCategories(posts)
    expect(cats).toHaveLength(2)
    expect(cats).toContain('Tech')
    expect(cats).toContain('Design')
  })

  it('空数组返回空', () => {
    expect(extractUniqueCategories([])).toEqual([])
  })
})

// ─── groupIntoRows ──────────────────────────────────────────────────

describe('groupIntoRows', () => {
  it('正常分组', () => {
    const items = [1, 2, 3, 4, 5, 6]
    const rows = groupIntoRows(items, 3, 2)
    expect(rows).toEqual([[1, 2, 3], [4, 5, 6]])
  })

  it('不够一行时仅有一行', () => {
    const rows = groupIntoRows([1, 2], 3, 2)
    expect(rows).toEqual([[1, 2]])
  })

  it('溢出项轮询分配到已有行', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8]
    const rows = groupIntoRows(items, 3, 2)
    // maxSlots = 6, direct: [[1,2,3],[4,5,6]], overflow: [7,8]
    // 7 → row 0, 8 → row 1
    expect(rows).toEqual([[1, 2, 3, 7], [4, 5, 6, 8]])
  })

  it('空数组返回空', () => {
    expect(groupIntoRows([], 3, 2)).toEqual([])
  })

  it('maxRows 为 0 时所有项都算溢出', () => {
    // maxSlots = 0, directItems = [], overflowItems = [1,2,3], rows = [] → forEach does nothing
    expect(groupIntoRows([1, 2, 3], 3, 0)).toEqual([])
  })
})
