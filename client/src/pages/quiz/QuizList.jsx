import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { quizApi } from '../../api/services'
import { AppLayout } from '../../components/layout/AppLayout'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { statusColor, formatDate, getErrorMessage } from '../../utils/helpers'
import toast from 'react-hot-toast'

export default function QuizList() {
  const navigate = useNavigate()
  const [quizzes,     setQuizzes]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [deleteId,    setDeleteId]    = useState(null)
  const [deleting,    setDeleting]    = useState(false)
  const [filter,      setFilter]      = useState('all')

  const load = () => {
    setLoading(true)
    quizApi.getAll(filter !== 'all' ? { status: filter } : {})
      .then(r => setQuizzes(r.data.quizzes))
      .catch(() => toast.error('Failed to load quizzes'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])

  const handleNew = async () => {
    try {
      const { data } = await quizApi.create({ title: 'Untitled Quiz' })
      navigate(`/quizzes/${data.quiz._id}/edit`)
    } catch (err) { toast.error(getErrorMessage(err)) }
  }

  const handleDuplicate = async (id, e) => {
    e.stopPropagation()
    try {
      const { data } = await quizApi.duplicate(id)
      toast.success('Quiz duplicated!')
      navigate(`/quizzes/${data.quiz._id}/edit`)
    } catch (err) { toast.error(getErrorMessage(err)) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await quizApi.delete(deleteId)
      setQuizzes(q => q.filter(x => x._id !== deleteId))
      toast.success('Quiz deleted')
      setDeleteId(null)
    } catch (err) { toast.error(getErrorMessage(err)) }
    finally { setDeleting(false) }
  }

  const tabs = ['all', 'draft', 'published', 'archived']

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="page-header">My Quizzes</h1>
          <button className="btn-primary btn-md" onClick={handleNew}>+ New Quiz</button>
        </div>

        {/* Filter tabs */}
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
        ) : quizzes.length === 0 ? (
          <EmptyState icon="📋" title="No quizzes found"
            description="Create your first quiz and go live in minutes."
            action={<button className="btn-primary btn-md" onClick={handleNew}>Create Quiz</button>} />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.map(q => (
              <div key={q._id} className="card p-5 hover:shadow-card-hover transition-all cursor-pointer group"
                onClick={() => navigate(`/quizzes/${q._id}/edit`)}>
                <div className="flex items-start justify-between mb-3">
                  <span className={`badge ${statusColor[q.status]}`}>{q.status}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-brand-600 transition-colors text-xs"
                      title="Duplicate" onClick={e => handleDuplicate(q._id, e)}>⧉</button>
                    <button className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors text-xs"
                      title="Delete" onClick={e => { e.stopPropagation(); setDeleteId(q._id) }}>🗑</button>
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors line-clamp-2 mb-1">{q.title}</h3>
                {q.description && <p className="text-xs text-gray-400 line-clamp-1 mb-3">{q.description}</p>}
                <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
                  <span className="text-xs text-gray-400">{formatDate(q.createdAt)}</span>
                  <span className="text-xs text-gray-400">⏱ {q.defaultTimeLimit}s / question</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        loading={deleting} title="Delete Quiz"
        message="This will permanently delete the quiz and all its questions. This cannot be undone." />
    </AppLayout>
  )
}
