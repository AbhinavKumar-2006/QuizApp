import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { quizApi, sessionApi } from '../../api/services'
import { AppLayout } from '../../components/layout/AppLayout'
import { Spinner } from '../../components/ui/Spinner'
import { formatDate, statusColor } from '../../utils/helpers'
import toast from 'react-hot-toast'

const StatCard = ({ icon, label, value, color }) => (
  <div className="card p-5 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${color}`}>{icon}</div>
    <div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  </div>
)

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [quizzes,  setQuizzes]  = useState([])
  const [sessions, setSessions] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([quizApi.getAll(), sessionApi.getAll()])
      .then(([qr, sr]) => { setQuizzes(qr.data.quizzes); setSessions(sr.data.sessions) })
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  const handleNewQuiz = async () => {
    try {
      const { data } = await quizApi.create({ title: 'Untitled Quiz' })
      navigate(`/quizzes/${data.quiz._id}/edit`)
    } catch { toast.error('Failed to create quiz') }
  }

  if (loading) return <AppLayout><div className="flex justify-center py-20"><Spinner size="lg" /></div></AppLayout>

  const activeSessions = sessions.filter(s => s.status === 'active' || s.status === 'waiting')

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-gray-500 mt-0.5">Ready to host a quiz?</p>
          </div>
          <button className="btn-primary btn-md" onClick={handleNewQuiz}>
            <span>+</span> New Quiz
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon="📋" label="Total Quizzes"    value={quizzes.length}                                  color="bg-brand-50" />
          <StatCard icon="✅" label="Published"        value={quizzes.filter(q=>q.status==='published').length} color="bg-green-50" />
          <StatCard icon="⚡" label="Total Sessions"   value={sessions.length}                                 color="bg-amber-50" />
          <StatCard icon="🔴" label="Active Now"       value={activeSessions.length}                           color="bg-red-50" />
        </div>

        {/* Active sessions alert */}
        {activeSessions.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3 animate-slide-down">
            <span className="text-green-600 text-xl">🟢</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-800">{activeSessions.length} live session{activeSessions.length > 1 ? 's' : ''} running</p>
              <p className="text-xs text-green-600 mt-0.5">
                Codes: {activeSessions.map(s => <strong key={s._id} className="font-mono">{s.joinCode} </strong>)}
              </p>
            </div>
            <button onClick={() => navigate('/sessions')} className="btn-md text-green-700 border border-green-300 bg-white hover:bg-green-50 btn">
              View →
            </button>
          </div>
        )}

        {/* Recent quizzes */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Recent Quizzes</h2>
            <Link to="/quizzes" className="text-sm text-brand-600 hover:underline font-medium">View all</Link>
          </div>
          {quizzes.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-gray-600 font-medium">No quizzes yet</p>
              <p className="text-gray-400 text-sm mt-1">Create your first quiz to get started</p>
              <button className="btn-primary btn-md mt-4" onClick={handleNewQuiz}>Create Quiz</button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quizzes.slice(0, 6).map(q => (
                <div key={q._id} className="card p-5 hover:shadow-card-hover transition-all cursor-pointer group"
                  onClick={() => navigate(`/quizzes/${q._id}/edit`)}>
                  <div className="flex items-start justify-between mb-3">
                    <span className={`badge ${statusColor[q.status]}`}>{q.status}</span>
                    <span className="text-xs text-gray-400">{formatDate(q.createdAt)}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors line-clamp-2">{q.title}</h3>
                  {q.description && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{q.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
