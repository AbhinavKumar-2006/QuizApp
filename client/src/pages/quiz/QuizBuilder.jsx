import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { quizApi, questionApi, sessionApi } from '../../api/services'
import { AppLayout } from '../../components/layout/AppLayout'
import { Spinner } from '../../components/ui/Spinner'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { getErrorMessage } from '../../utils/helpers'
import toast from 'react-hot-toast'

const EMPTY_OPTION = (order) => ({ text: '', isCorrect: false, order })
const EMPTY_QUESTION = () => ({
  text: '', type: 'mcq', points: 1000, timeLimit: null, imageUrl: null,
  options: [EMPTY_OPTION(0), EMPTY_OPTION(1), EMPTY_OPTION(2), EMPTY_OPTION(3)]
})

const OptionInput = ({ opt, idx, type, onChange, onToggleCorrect }) => {
  const colors = ['border-red-300 focus:ring-red-400', 'border-blue-300 focus:ring-blue-400', 'border-amber-300 focus:ring-amber-400', 'border-green-300 focus:ring-green-400']
  const labels = ['A', 'B', 'C', 'D']
  const isPoll = type === 'poll'

  return (
    <div className={`flex items-center gap-2 p-2 rounded-xl border-2 transition-all ${opt.isCorrect ? 'border-green-400 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0
        ${opt.isCorrect ? 'bg-green-500' : 'bg-gray-300'}`}>{labels[idx]}</div>
      <input
        className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 placeholder-gray-400"
        placeholder={`Option ${labels[idx]}`}
        value={opt.text}
        onChange={e => onChange(idx, 'text', e.target.value)}
      />
      {!isPoll && (
        <button type="button" title={opt.isCorrect ? 'Correct answer' : 'Mark as correct'}
          onClick={() => onToggleCorrect(idx)}
          className={`text-lg transition-all ${opt.isCorrect ? 'opacity-100' : 'opacity-30 hover:opacity-70'}`}>
          ✓
        </button>
      )}
    </div>
  )
}

const QuestionEditor = ({ question, onSave, onClose, quizId, loading }) => {
  const [q, setQ] = useState(() => question || EMPTY_QUESTION())
  const isEdit = !!question
  const cachedOptions = useRef(null)

  const setField = (key, val) => setQ(prev => ({ ...prev, [key]: val }))
  const setOption = (idx, key, val) => setQ(prev => {
    const opts = [...prev.options]
    opts[idx] = { ...opts[idx], [key]: val }
    return { ...prev, options: opts }
  })
  const toggleCorrect = (idx) => {
    setQ(prev => {
      const opts = prev.options.map((o, i) => prev.type === 'true_false'
        ? { ...o, isCorrect: i === idx }
        : i === idx ? { ...o, isCorrect: !o.isCorrect } : o)
      return { ...prev, options: opts }
    })
  }

  const handleTypeChange = (type) => {
    if (type === q.type) return
    let opts = q.options
    if (type === 'true_false') {
      if (q.type !== 'true_false') cachedOptions.current = q.options
      opts = [{ text: 'True', isCorrect: true, order: 0 }, { text: 'False', isCorrect: false, order: 1 }]
    } else if (q.type === 'true_false') {
      opts = cachedOptions.current || [EMPTY_OPTION(0), EMPTY_OPTION(1), EMPTY_OPTION(2), EMPTY_OPTION(3)]
    }
    setQ(prev => ({ ...prev, type, options: opts }))
  }

  const validate = () => {
    if (!q.text.trim()) { toast.error('Question text is required'); return false }
    if (q.options.filter(o => o.text.trim()).length < 2) { toast.error('At least 2 options required'); return false }
    if (q.type !== 'poll' && !q.options.some(o => o.isCorrect && o.text.trim())) {
      toast.error('Mark at least one correct answer'); return false
    }
    return true
  }

  const handleSave = () => {
    if (!validate()) return
    const payload = { ...q, options: q.options.filter(o => o.text.trim()).map((o, i) => ({ ...o, order: i })) }
    onSave(payload)
  }

  return (
    <div className="space-y-5">
      {/* Type selector */}
      <div className="flex gap-2">
        {['mcq', 'true_false', 'poll'].map(t => (
          <button key={t} type="button"
            onClick={() => handleTypeChange(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize border transition-all
              ${q.type === t ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-400'}`}>
            {t === 'true_false' ? 'True/False' : t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Question text */}
      <div>
        <label className="label">Question</label>
        <textarea rows={3} className="input resize-none" placeholder="Type your question here…"
          value={q.text} onChange={e => setField('text', e.target.value)} />
      </div>

      {/* Options */}
      <div>
        <label className="label">{q.type === 'poll' ? 'Options' : 'Options (mark correct answers ✓)'}</label>
        <div className="space-y-2">
          {q.options.map((opt, idx) => (
            <OptionInput key={idx} opt={opt} idx={idx} type={q.type}
              onChange={setOption} onToggleCorrect={toggleCorrect} />
          ))}
        </div>
      </div>

      {/* Settings row */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="label">Time limit (sec)</label>
          <input className="input" type="number" min={5} max={120} placeholder="Default (quiz setting)"
            value={q.timeLimit || ''} onChange={e => setField('timeLimit', e.target.value ? parseInt(e.target.value) : null)} />
        </div>
        <div className="flex-1">
          <label className="label">Points</label>
          <input className="input" type="number" min={0} max={10000} step={100}
            value={q.points} onChange={e => setField('points', parseInt(e.target.value) || 0)} />
        </div>
      </div>

      {/* Image URL */}
      <div>
        <label className="label">Image URL (optional)</label>
        <input className="input" type="url" placeholder="https://example.com/image.png"
          value={q.imageUrl || ''} onChange={e => setField('imageUrl', e.target.value)} />
        {q.imageUrl && (
          <div className="mt-2 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex justify-center max-h-40">
            <img src={q.imageUrl} alt="Question preview" className="object-contain" 
                 onError={(e) => e.target.style.display = 'none'} 
                 onLoad={(e) => e.target.style.display = 'block'} />
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button className="btn-secondary btn-md" type="button" onClick={onClose} disabled={loading}>Cancel</button>
        <button className="btn-primary btn-md" type="button" onClick={handleSave} disabled={loading}>
          {loading ? 'Saving…' : isEdit ? 'Update Question' : 'Add Question'}
        </button>
      </div>
    </div>
  )
}

export default function QuizBuilder() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const [quiz,       setQuiz]       = useState(null)
  const [questions,  setQuestions]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [launching,  setLaunching]  = useState(false)
  const [qModal,     setQModal]     = useState(false)
  const [editQ,      setEditQ]      = useState(null)
  const [deleteQId,  setDeleteQId]  = useState(null)
  const [deleting,   setDeleting]   = useState(false)
  const [quizForm,   setQuizForm]   = useState({ title: '', description: '', defaultTimeLimit: 30, status: 'draft' })

  useEffect(() => {
    quizApi.get(quizId)
      .then(({ data }) => {
        setQuiz(data.quiz)
        setQuestions(data.questions)
        setQuizForm({ title: data.quiz.title, description: data.quiz.description, defaultTimeLimit: data.quiz.defaultTimeLimit, status: data.quiz.status })
      })
      .catch(() => { toast.error('Quiz not found'); navigate('/quizzes') })
      .finally(() => setLoading(false))
  }, [quizId])

  const saveQuizMeta = async () => {
    setSaving(true)
    try {
      const { data } = await quizApi.update(quizId, quizForm)
      setQuiz(data.quiz)
      toast.success('Saved')
    } catch (err) { toast.error(getErrorMessage(err)) }
    finally { setSaving(false) }
  }

  const handleAddQuestion = async (payload) => {
    setSaving(true)
    try {
      const { data } = await questionApi.create(quizId, payload)
      setQuestions(q => [...q, data.question])
      setQModal(false)
      toast.success('Question added')
    } catch (err) { toast.error(getErrorMessage(err)) }
    finally { setSaving(false) }
  }

  const handleUpdateQuestion = async (payload) => {
    setSaving(true)
    try {
      const { data } = await questionApi.update(quizId, editQ._id, payload)
      setQuestions(q => q.map(x => x._id === data.question._id ? data.question : x))
      setEditQ(null)
      toast.success('Question updated')
    } catch (err) { toast.error(getErrorMessage(err)) }
    finally { setSaving(false) }
  }

  const handleDeleteQuestion = async () => {
    setDeleting(true)
    try {
      await questionApi.delete(quizId, deleteQId)
      setQuestions(q => q.filter(x => x._id !== deleteQId))
      toast.success('Question deleted')
      setDeleteQId(null)
    } catch (err) { toast.error(getErrorMessage(err)) }
    finally { setDeleting(false) }
  }

  const handleLaunch = async () => {
    if (questions.length === 0) { toast.error('Add at least one question before launching'); return }
    setLaunching(true)
    try {
      const { data } = await sessionApi.create(quizId)
      toast.success(`Session created! Code: ${data.session.joinCode}`)
      navigate(`/sessions/${data.session._id}/host`)
    } catch (err) { toast.error(getErrorMessage(err)) }
    finally { setLaunching(false) }
  }

  if (loading) return <AppLayout><div className="flex justify-center py-20"><Spinner size="lg" /></div></AppLayout>

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/quizzes')} className="btn-ghost btn-sm text-gray-500">← Back</button>
          <div className="flex gap-2">
            <button className="btn-secondary btn-md" onClick={saveQuizMeta} disabled={saving}>
              {saving ? 'Saving…' : '💾 Save'}
            </button>
            <button className="btn-primary btn-md" onClick={handleLaunch} disabled={launching}>
              {launching ? 'Launching…' : '🚀 Go Live'}
            </button>
          </div>
        </div>

        {/* Quiz meta form */}
        <div className="card p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Quiz Settings</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Title</label>
              <input className="input text-base font-semibold" placeholder="Quiz title"
                value={quizForm.title} onChange={e => setQuizForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Description (optional)</label>
              <input className="input" placeholder="Short description"
                value={quizForm.description} onChange={e => setQuizForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="label">Default time per question (sec)</label>
              <input className="input" type="number" min={5} max={120}
                value={quizForm.defaultTimeLimit} onChange={e => setQuizForm(f => ({ ...f, defaultTimeLimit: parseInt(e.target.value) }))} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={quizForm.status} onChange={e => setQuizForm(f => ({ ...f, status: e.target.value }))}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Questions ({questions.length})
            </h2>
            <button className="btn-primary btn-sm" onClick={() => { setEditQ(null); setQModal(true) }}>+ Add Question</button>
          </div>

          {questions.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
              <p className="text-3xl mb-2">❓</p>
              <p className="text-gray-500 text-sm font-medium">No questions yet</p>
              <button className="btn-primary btn-sm mt-4" onClick={() => setQModal(true)}>Add First Question</button>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div key={q._id} className="flex items-start gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all group">
                  <div className="w-7 h-7 flex-shrink-0 bg-brand-100 text-brand-700 rounded-lg flex items-center justify-center text-xs font-bold mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm line-clamp-2">{q.text}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-gray-400 uppercase font-medium">{q.type}</span>
                      <span className="text-xs text-gray-400">⏱ {q.timeLimit || quiz?.defaultTimeLimit}s</span>
                      <span className="text-xs text-gray-400">⭐ {q.points} pts</span>
                      <span className="text-xs text-gray-400">{q.options?.length} options</span>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-brand-600 transition-colors text-sm"
                      onClick={() => { setEditQ(q); setQModal(true) }}>✏️</button>
                    <button className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors text-sm"
                      onClick={() => setDeleteQId(q._id)}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Question modal */}
      <Modal open={qModal} onClose={() => { setQModal(false); setEditQ(null) }}
        title={editQ ? 'Edit Question' : 'Add Question'} size="lg">
        <QuestionEditor
          question={editQ} quizId={quizId} loading={saving}
          onClose={() => { setQModal(false); setEditQ(null) }}
          onSave={editQ ? handleUpdateQuestion : handleAddQuestion}
        />
      </Modal>

      <ConfirmDialog open={!!deleteQId} onClose={() => setDeleteQId(null)}
        onConfirm={handleDeleteQuestion} loading={deleting}
        title="Delete Question" message="Are you sure you want to delete this question?" />
    </AppLayout>
  )
}
