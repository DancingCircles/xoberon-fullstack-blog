const MONTH_MAP: Record<string, string> = {
  'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
  'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
  'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
}

/**
 * Format a date string to YYYY-MM-DD format.
 * Handles both 'YYYY-MM-DD' and 'Oct 24, 2025' formats.
 */
export function formatDate(dateStr: string): string {
  // If already ISO format, return directly
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr
  }

  // Handle "Oct 24, 2025" format
  const match = dateStr.match(/^([A-Z][a-z]{2})\s+(\d{1,2}),?\s+(\d{4})$/)
  if (match) {
    const [, month, day, year] = match
    const monthNum = MONTH_MAP[month]
    const dayPadded = day.padStart(2, '0')
    return `${year}-${monthNum}-${dayPadded}`
  }

  return dateStr
}
