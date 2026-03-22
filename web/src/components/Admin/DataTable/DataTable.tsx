import { Fragment, type ReactNode } from 'react'
import './DataTable.css'

export interface Column<T> {
  key: string
  title: string
  width?: string
  className?: string
  render: (row: T, index: number) => ReactNode
}

interface PaginationConfig {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  rowKey: (row: T) => string
  emptyText?: string
  pagination?: PaginationConfig
  onRowClick?: (row: T) => void
  expandedKey?: string | null
  onToggleExpand?: (key: string) => void
  renderExpanded?: (row: T) => ReactNode
}

export default function DataTable<T>({
  columns,
  data,
  rowKey,
  emptyText = '暂无数据',
  pagination,
  onRowClick,
  expandedKey,
  onToggleExpand,
  renderExpanded,
}: DataTableProps<T>) {
  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.pageSize)
    : 0

  const isExpandable = !!renderExpanded && !!onToggleExpand

  return (
    <div className="data-table__wrapper">
      <table className="data-table">
        <thead className="data-table__head">
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className={`data-table__th ${col.className ?? ''}`}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="data-table__body">
          {data.length === 0 ? (
            <tr>
              <td className="data-table__empty" colSpan={columns.length}>
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => {
              const key = rowKey(row)
              const isExpanded = isExpandable && expandedKey === key

              return (
                <Fragment key={key}>
                  <tr
                    className={`data-table__row ${onRowClick || isExpandable ? 'data-table__row--clickable' : ''} ${isExpanded ? 'data-table__row--expanded' : ''}`}
                    onClick={() => {
                      if (isExpandable) {
                        onToggleExpand(key)
                      } else {
                        onRowClick?.(row)
                      }
                    }}
                  >
                    {columns.map(col => (
                      <td key={col.key} className={`data-table__td ${col.className ?? ''}`}>
                        {col.render(row, idx)}
                      </td>
                    ))}
                  </tr>
                  {isExpanded && (
                    <tr className="data-table__expand-row">
                      <td colSpan={columns.length} className="data-table__expand-cell">
                        {renderExpanded(row)}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })
          )}
        </tbody>
      </table>

      {pagination && totalPages > 1 && (
        <div className="data-table__pagination">
          <button
            className="data-table__page-btn"
            disabled={pagination.page <= 1}
            onClick={() => pagination.onPageChange(pagination.page - 1)}
          >
            &laquo; Prev
          </button>
          <span className="data-table__page-info">
            {pagination.page} / {totalPages}
          </span>
          <button
            className="data-table__page-btn"
            disabled={pagination.page >= totalPages}
            onClick={() => pagination.onPageChange(pagination.page + 1)}
          >
            Next &raquo;
          </button>
        </div>
      )}
    </div>
  )
}
