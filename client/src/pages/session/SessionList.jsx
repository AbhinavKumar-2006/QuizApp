import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { sessionApi } from '../../api/services'
import { AppLayout } from '../../components/layout/AppLayout'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { statusColor, formatDate, formatTime, getErrorMessage } from '../../utils/helpers'
import toast from 'react-hot-toast'

export default function SessionList() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [filter,   setFilter]   = useState('all')

  const load = () => {
    setLoading(true)
    sessionApi.getAll(filter !== 'all' ? { status: filter } : {})
      .then(r => setSessions(r.data.sessions))
      .catch(() => toast.error('Failed to load sessions'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await sessionApi.delete(deleteId)
      setSessions(s => s.filter(x => x._id !== deleteId))
      toast.success('Session deleted')
      setDeleteId(null)
    } catch (err) { toast.error(getErrorMessage(err)) }
    finally { setDeleting(false) }
  }

  const tabs = ['all', 'waiting', 'active', 'ended']

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto animate-fade-in">
        <h1 className="page-header mb-6">Sessions</h1>

        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
          {tabs.map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all
                ${filter === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : sessions.length === 0 ? (
          <EmptyState icon="⚡" title="No sessions found"
            description="Launch a quiz to create a session." />
        ) : (
          <div className="space-y-3">
            {sessions.map(s => (
              <div key={s._id} className="card p-5 flex items-center gap-4 hover:shadow-card-hover transition-all group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge ${statusColor[s.status]}`}>{s.status}</span>
                    <span className="font-mono text-sm font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-lg">{s.joinCode}</span>
                  </div>
                  <p className="font-semibold text-gray-900 truncate">{s.quizId?.title || 'Untitled Quiz'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(s.createdAt)} at {formatTime(s.createdAt)}</p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {(s.status === 'active' || s.status === 'waiting') && (
                    <button className="btn-primary btn-sm"
                      onClick={() => navigate(`/sessions/${s._id}/host`)}>
                      Resume →
                    </button>
                  )}
                  {s.status === 'ended' && (
                    <button className="btn-secondary btn-sm"
                      onClick={() => navigate(`/sessions/${s._id}/results`)}>
                      Results
                    </button>
                  )}
                  {s.status !== 'active' && (
                    <button className="btn-ghost btn-sm text-red-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => setDeleteId(s._id)}>🗑</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        loading={deleting} title="Delete Session"
        message="This will delete the session and all response data." />
    </AppLayout>
  )
}
