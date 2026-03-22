import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { LenisProvider } from '../contexts/lenis/LenisProvider'
import { LikesProvider } from '../contexts/likes/LikesProvider'
import { AuthProvider } from '../contexts/auth/AuthProvider'
import { DataProvider } from '../contexts/data/DataProvider'
import { useHeartbeat } from '../hooks/auth/useHeartbeat'
import ErrorBoundary from '../components/Common/ErrorBoundary'
import Navigation from '../components/Layout/Navigation'
import ScrollToTop from '../components/Common/ScrollToTop'
import AdminRoute from '../components/Admin/AdminRoute'
import ProtectedRoute from '../components/Common/ProtectedRoute'
import AdminLayout from '../components/Admin/AdminLayout'
import HomePage from '../pages/Home/HomePage'
import BlogPage from '../pages/Blog/BlogPage'
import CreatePostPage from '../pages/CreatePost/CreatePostPage'
import WorksPage from '../pages/Works/WorksPage'
import SearchResultsPage from '../pages/Search/SearchResultsPage'
import AboutPage from '../pages/About/AboutPage'
import ContactPage from '../pages/Contact/ContactPage'
import AuthorPage from '../pages/Author/AuthorPage'
import LoginPage from '../pages/Login/LoginPage'
import NotFoundPage from '../pages/NotFound/NotFoundPage'
import AdminDashboardPage from '../pages/Admin/Dashboard/AdminDashboardPage'
import AdminReviewsPage from '../pages/Admin/Reviews/AdminReviewsPage'
import AdminUsersPage from '../pages/Admin/Users/AdminUsersPage'
import AdminContactsPage from '../pages/Admin/Contacts/AdminContactsPage'
import ToastProvider from '../contexts/toast/ToastProvider'

// Register GSAP ScrollTrigger
gsap.registerPlugin(ScrollTrigger)

function HeartbeatReporter() {
  useHeartbeat()
  return null
}

export default function App() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) {
        e.preventDefault()
      }
    }
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('wheel', handleWheel)
    }
  }, [])

  return (
    <LikesProvider>
    <ToastProvider>
      <BrowserRouter>
        <AuthProvider>
        <DataProvider>
        <HeartbeatReporter />
        <Routes>
          <Route path="/login" element={<ErrorBoundary><LoginPage /></ErrorBoundary>} />
          <Route path="/admin" element={
            <ErrorBoundary>
              <ScrollToTop />
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            </ErrorBoundary>
          }>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="reviews" element={<AdminReviewsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="contacts" element={<AdminContactsPage />} />
          </Route>
          <Route path="/*" element={
            <LenisProvider>
            <ScrollToTop />
            <div className="app">
              <Navigation />
              <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Navigate to="/home" replace />} />
                <Route path="/home" element={<HomePage />} />
                <Route path="/journal" element={<BlogPage />} />
                <Route path="/create-post" element={<CreatePostPage />} />
                <Route path="/search" element={<WorksPage />} />
                <Route path="/search/results" element={<ProtectedRoute><SearchResultsPage /></ProtectedRoute>} />
                <Route path="/notes" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/author/:authorId" element={<AuthorPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
              </ErrorBoundary>
            </div>
            </LenisProvider>
          } />
        </Routes>
        </DataProvider>
        </AuthProvider>
      </BrowserRouter>
    </ToastProvider>
    </LikesProvider>
  )
}
