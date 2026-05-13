import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { PageLoader } from './components/ui/Spinner'

// Auth pages
import Login    from './pages/auth/Login'
import Register from './pages/auth/Register'

// Dashboard
import Dashboard from './pages/dashboard/Dashboard'

// Quiz
import QuizList    from './pages/quiz/QuizList'
import QuizBuilder from './pages/quiz/QuizBuilder'

// Session (host)
import SessionList    from './pages/session/SessionList'
import SessionResults from './pages/session/SessionResults'
import HostSession    from './pages/host/HostSession'

// Participant
import JoinSession from './pages/participant/JoinSession'
import PlaySession from './pages/participant/PlaySession'

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  return user ? children : <Navigate to="/login" replace />
}

const PublicOnlyRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  return !user ? children : <Navigate to="/dashboard" replace />
}

const AppRoutes = () => (
  <Routes>
    {/* Root → dashboard */}
    <Route path="/" element={<Navigate to="/dashboard" replace />} />

    {/* Auth (public only — logged in users are redirected away) */}
    <Route path="/login"    element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
    <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />

    {/* Participant (fully public — no auth needed) */}
    <Route path="/join"                    element={<JoinSession />} />
    <Route path="/sessions/:sessionId/play" element={<PlaySession />} />

    {/* Protected: host/dashboard routes */}
    <Route path="/dashboard"  element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/quizzes"    element={<ProtectedRoute><QuizList /></ProtectedRoute>} />
    <Route path="/quizzes/:quizId/edit" element={<ProtectedRoute><QuizBuilder /></ProtectedRoute>} />
    <Route path="/sessions"   element={<ProtectedRoute><SessionList /></ProtectedRoute>} />
    <Route path="/sessions/:sessionId/host"    element={<ProtectedRoute><HostSession /></ProtectedRoute>} />
    <Route path="/sessions/:sessionId/results" element={<ProtectedRoute><SessionResults /></ProtectedRoute>} />

    {/* 404 */}
    <Route path="*" element={
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-6xl">🤷</p>
        <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
        <a href="/dashboard" className="btn-primary btn-md">Go home</a>
      </div>
    } />
  </Routes>
)

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
