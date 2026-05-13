import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { sessionApi } from '../../api/services'
import { AppLayout } from '../../components/layout/AppLayout'
import { Spinner } from '../../components/ui/Spinner'
import { Leaderboard } from '../../components/ui/Leaderboard'
import { OPTION_COLORS } from '../../utils/helpers'
import toast from 'react-hot-toast'

export default function SessionResults() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeQ, setActiveQ] = useState(0)

  useEffect(() => {
    sessionApi.results(sessionId)
      .then(r => setData(r.data))
      .catch(() => { toast.error('Results not found'); navigate('/sessions') })
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) return <AppLayout><div className="flex justify-center py-20"><Spinner size="lg" /></div></AppLayout>

  const { results, finalLeaderboard, session } = data
  const q = results[activeQ]

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => navigate('/sessions')} className="text-sm text-gray-400 hover:text-gray-600 mb-1 block">← Sessions</button>
            <h1 className="page-header">Session Results</h1>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: question breakdown */}
          <div className="lg:col-span-2 space-y-4">
            {/* Question selector */}
            <div className="card p-4">
              <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide mb-3">Questions</p>
              <div className="flex flex-wrap gap-2">
                {results.map((r, i) => (
                  <button key={i} onClick={() => setActiveQ(i)}
                    className={`w-9 h-9 rounded-xl text-sm font-bold transition-all
                      ${activeQ === i ? 'bg-brand-600 text-white shadow-brand' : 'bg-gray-100 text-gray-600 hover:bg-brand-50 hover:text-brand-600'}`}>
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>

            {q && (
              <div className="card p-6 animate-fade-in">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="badge bg-brand-50 text-brand-700 mb-2">Q{activeQ + 1}</span>
                    <h3 className="font-bold text-gray-900 text-lg">{q.question.text}</h3>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <p className="text-2xl font-bold text-gray-900">{q.accuracy}%</p>
                    <p className="text-xs text-gray-400">accuracy</p>
                  </div>
                </div>

                {/* Option bars */}
                <div className="space-y-3 mb-5">
                  {q.optionBreakdown.map((opt, i) => {
                    const pct = q.totalAnswers > 0 ? Math.round((opt.count / q.totalAnswers) * 100) : 0
                    const c = OPTION_COLORS[i % 4]
                    return (
                      <div key={opt.optionId}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold ${opt.isCorrect ? 'bg-green-500' : c.bg}`}>
                              {opt.isCorrect ? '✓' : ['A','B','C','D'][i]}
                            </span>
                            <span className={`font-medium ${opt.isCorrect ? 'text-green-700' : 'text-gray-700'}`}>{opt.text}</span>
                          </div>
                          <span className="text-gray-500 font-medium">{opt.count} ({pct}%)</span>
                        </div>
                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-700 ${opt.isCorrect ? 'bg-green-500' : c.bg}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="flex gap-6 pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-400">Responses</p>
                    <p className="text-lg font-bold text-gray-900">{q.totalAnswers}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Correct</p>
                    <p className="text-lg font-bold text-green-600">{q.correctAnswers}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Wrong</p>
                    <p className="text-lg font-bold text-red-500">{q.totalAnswers - q.correctAnswers}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: final leaderboard */}
          <div className="card p-5">
            <Leaderboard entries={finalLeaderboard} title="Final Standings" />
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
