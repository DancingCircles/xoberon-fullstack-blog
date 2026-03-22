import { Outlet } from 'react-router-dom'
import AdminSidebar from '../AdminSidebar'
import './AdminLayout.css'

export default function AdminLayout() {
  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-layout__content">
        <Outlet />
      </main>
    </div>
  )
}
