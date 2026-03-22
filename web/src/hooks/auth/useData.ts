import { useContext } from 'react'
import { DataContext, type DataContextType } from '../../contexts/data/DataContext'

export function useData(): DataContextType {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within a DataProvider')
  return ctx
}
