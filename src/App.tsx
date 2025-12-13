import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { Toaster } from '@/components/ui/toaster'
import { BottomNav } from '@/components/BottomNav'

// Pages
import HomePage from '@/pages/HomePage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import ProfilePage from '@/pages/ProfilePage'
import CreateRidePage from '@/pages/CreateRidePage'
import RideDetailsPage from '@/pages/RideDetailsPage'
import PaymentPage from '@/pages/PaymentPage'
import MyRidesPage from '@/pages/MyRidesPage'
import SearchPage from '@/pages/SearchPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// Layout with bottom nav
function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  return (
    <>
      {children}
      {user && <BottomNav />}
    </>
  )
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-avocado-50 to-white">
        <div className="text-center">
          <div className="w-16 h-16 bg-avocado-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-white">BO</span>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-avocado-600 mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <LoginPage />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to="/" replace /> : <RegisterPage />}
        />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <SearchPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rides/create"
          element={
            <ProtectedRoute>
              <CreateRidePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rides/:id"
          element={
            <ProtectedRoute>
              <RideDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bookings/:id/pay"
          element={
            <ProtectedRoute>
              <PaymentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-rides"
          element={
            <ProtectedRoute>
              <MyRidesPage />
            </ProtectedRoute>
          }
        />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <AppRoutes />
          <Toaster />
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  )
}
