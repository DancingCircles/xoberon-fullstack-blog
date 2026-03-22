import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../../test/test-utils'
import DataTable, { type Column } from '../DataTable'

interface TestRow {
  id: string
  name: string
  value: number
}

const columns: Column<TestRow>[] = [
  { key: 'name', title: '名称', render: row => row.name },
  { key: 'value', title: '数值', render: row => row.value },
]

const testData: TestRow[] = [
  { id: '1', name: 'Item A', value: 10 },
  { id: '2', name: 'Item B', value: 20 },
]

describe('DataTable', () => {
  it('应该渲染表头', () => {
    renderWithProviders(
      <DataTable columns={columns} data={testData} rowKey={r => r.id} />
    )
    expect(screen.getByText('名称')).toBeInTheDocument()
    expect(screen.getByText('数值')).toBeInTheDocument()
  })

  it('应该渲染数据行', () => {
    renderWithProviders(
      <DataTable columns={columns} data={testData} rowKey={r => r.id} />
    )
    expect(screen.getByText('Item A')).toBeInTheDocument()
    expect(screen.getByText('Item B')).toBeInTheDocument()
  })

  it('空数据展示默认空文本', () => {
    renderWithProviders(
      <DataTable columns={columns} data={[]} rowKey={r => r.id} />
    )
    expect(screen.getByText('暂无数据')).toBeInTheDocument()
  })

  it('空数据展示自定义空文本', () => {
    renderWithProviders(
      <DataTable columns={columns} data={[]} rowKey={r => r.id} emptyText="Nothing here" />
    )
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
  })

  it('分页应该正常展示', () => {
    const onPageChange = vi.fn()
    renderWithProviders(
      <DataTable
        columns={columns}
        data={testData}
        rowKey={r => r.id}
        pagination={{ page: 1, pageSize: 10, total: 30, onPageChange }}
      />
    )
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
  })

  it('点击 Next 触发翻页', async () => {
    const onPageChange = vi.fn()
    renderWithProviders(
      <DataTable
        columns={columns}
        data={testData}
        rowKey={r => r.id}
        pagination={{ page: 1, pageSize: 10, total: 30, onPageChange }}
      />
    )
    await userEvent.click(screen.getByText(/Next/))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })
})
