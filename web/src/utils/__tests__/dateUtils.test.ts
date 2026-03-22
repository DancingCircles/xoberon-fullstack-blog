import { describe, it, expect } from 'vitest'
import { formatDate } from '../dateUtils'

describe('formatDate', () => {
  it('ISO 格式直接返回', () => {
    expect(formatDate('2025-06-15')).toBe('2025-06-15')
  })

  it('"Oct 24, 2025" 格式正确转换', () => {
    expect(formatDate('Oct 24, 2025')).toBe('2025-10-24')
  })

  it('不带逗号也能转换（"Oct 24 2025"）', () => {
    expect(formatDate('Oct 24 2025')).toBe('2025-10-24')
  })

  it('单位数日期自动补零', () => {
    expect(formatDate('Jan 5, 2025')).toBe('2025-01-05')
  })

  it('所有月份映射正确', () => {
    expect(formatDate('Feb 1, 2025')).toBe('2025-02-01')
    expect(formatDate('Mar 15, 2025')).toBe('2025-03-15')
    expect(formatDate('Dec 31, 2025')).toBe('2025-12-31')
  })

  it('无法识别的格式原样返回', () => {
    expect(formatDate('2025/06/15')).toBe('2025/06/15')
    expect(formatDate('some random string')).toBe('some random string')
  })

  it('空字符串原样返回', () => {
    expect(formatDate('')).toBe('')
  })
})
