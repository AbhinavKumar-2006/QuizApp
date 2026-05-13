import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { sessionApi } from '../../api/services'
import { useSocket } from '../../hooks/useSocket'
import { useCountdown } from '../../hooks/useCountdown'
import { Leaderboard } from '../../components/ui/Leaderboard'
import { Spinner } from '../../components/ui/Spinner'
import { TimerRing } from '../../components/ui/TimerRing'
import { OPTION_COLORS } from '../../utils/helpers'
import toast from 'react-hot-toast'

const PHASE = { LOBBY: 'lobby', QUESTION: 'question', REVEAL: 'reveal', ENDED: 'ended' }

export default function HostSession() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  const [session,      setSession]      = useState(null)
  const [participants, setParticipants] = useState([])
  const [phase,        setPhase]        = useState(PHASE.LOBBY)
  const [currentQ,     setCurrentQ]     = useState(null)
  const [qIndex,       setQIndex]       = useState(0)
  const [qTotal,       setQTotal]       = useState(0)
  const [timeLimit,    setTimeLimit]    = useState(30)
  const [answerCount,  setAnswerCount]  = useState(0)
  const [leaderboard,  setLeaderboard]  = useState([])
  const [revealData,   setRevealData]   = useState(null)
  const [loading,      setLoading]      = useState(true)

  const { timeLeft, isRunning, start, stop } = useCountdown(30, () => {})

  const { emit, on, connected } = useSocket({
    sessionId, role: 'host', token, enabled: !!session
  })

  // Load session
  useEffect(() => {
    sessionApi.get(sessionId)
      .then(({ data }) => {
        setSession(data.session)
        setParticipants(data.participants)
        if (data.session.status === 'ended') setPhase(PHASE.ENDED)
        if (data.session.status === 'active') setPhase(PHASE.QUESTION)
      })
      .catch(() => { toast.error('Session not found'); navigate('/sessions') })
      .finally(() => setLoading(false))
  }, [sessionId])

  // Socket listeners
  useEffect(() => {
    const unsubs = [
      on('session:participants', ({ participants }) => setParticipants(participants)),
      on('session:started',      ({ totalQuestions }) => { setQTotal(totalQuestions) }),
      on('session:question',     ({ question, index, total, timeLimit: tl }) => {
        setCurrentQ(question)
        setQIndex(index)
        setQTotal(total)
        setTimeLimit(tl)
        setAnswerCount(0)
        setRevealData(null)
        setPhase(PHASE.QUESTION)
        start(tl)
      }),
      on('session:question_stats', ({ answerCount, totalParticipants }) => {
        setAnswerCount(answerCount)
      }),
      on('session:reveal',       (data) => {
        stop()
        setRevealData(data)
        setLeaderboard(data.leaderboard)
        setPhase(PHASE.REVEAL)
      }),
      on('session:ended',        ({ finalLeaderboard }) => {
        setLeaderboard(finalLeaderboard)
        setPhase(PHASE.ENDED)
      }),
      on('error', ({ message }) => toast.error(message)),
    ]
    return () => unsubs.forEach(fn => fn?.())
  }, [on, start, stop])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="xl" />
    </div>
  )

  // ── LOBBY ────────────────────────────────────────────────────────
  if (phase === PHASE.LOBBY) return (
    <div className="min-h-screen bg-gradient-to-br from-brand-600 to-purple-700 flex flex-col items-center justify-center p-6 text-white">
      <div className="w-full max-w-2xl animate-slide-up">
        <div className="text-center mb-8">
          <p className="text-brand-200 text-sm font-medium uppercase tracking-widest mb-2">Waiting Room</p>
          <h1 className="text-4xl font-bold mb-2">{session?.quizId?.title}</h1>
          <p className="text-brand-200">Share this code with participants</p>
        </div>

        {/* Join code */}
        <div className="bg-white/15 backdrop-blur rounded-3xl p-8 text-center mb-6">
          <p className="text-brand-200 text-sm font-medium mb-2">Join Code</p>
          <div className="text-7xl font-bold font-mono tracking-widest text-white mb-2">
            {session?.joinCode}
          </div>
          <p className="text-brand-200 text-sm">Go to quizlive.app/join</p>
        </div>

        {/* Participants */}
        <div className="bg-white/15 backdrop-blur rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-sm">
              {participants.length} joined {participants.length > 0 ? '🎉' : ''}
            </p>
            <div className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
          </div>
          {participants.length === 0 ? (
            <p className="text-brand-200 text-sm text-center py-4">Waiting for participants to join…</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {participants.map((p, i) => (
                <span key={p._id || i} className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium animate-bounce-in">
                  {p.nickname}
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          className="w-full py-4 bg-white text-brand-700 font-bold text-lg rounded-2xl hover:bg-brand-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
          onClick={() => emit('host:start')}
          disabled={participants.length === 0}
        >
          {participants.length === 0 ? 'Waiting for players…' : `Start Quiz →`}
        </button>
      </div>
    </div>
  )

  // ── ENDED ────────────────────────────────────────────────────────
  if (phase === PHASE.ENDED) return (
    <div className="min-h-screen bg-gradient-to-br from-brand-600 to-purple-700 flex flex-col items-center justify-center p-6 text-white">
      <div className="w-full max-w-lg animate-slide-up">
        <div className="text-center mb-6">
          <p className="text-5xl mb-3">🏆</p>
          <h1 className="text-3xl font-bold">Quiz Ended!</h1>
          <p className="text-brand-200 mt-1">Final results</p>
        </div>
        <div className="bg-white rounded-2xl p-6 mb-4">
          <Leaderboard entries={leaderboard} />
        </div>
        <div className="flex gap-3">
          <button className="flex-1 py-3 bg-white/20 hover:bg-white/30 rounded-xl font-semibold transition-all"
            onClick={() => navigate(`/sessions/${sessionId}/results`)}>View Full Results</button>
          <button className="flex-1 py-3 bg-white text-brand-700 rounded-xl font-semibold hover:bg-brand-50 transition-all"
            onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
        </div>
      </div>
    </div>
  )

  // ── ACTIVE QUESTION / REVEAL ─────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          <span className="text-gray-300 text-sm font-medium font-mono">{session?.joinCode}</span>
        </div>
        <span className="text-white font-bold text-sm">Q {qIndex + 1} / {qTotal}</span>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">{answerCount}/{participants.length} answered</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main area */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          {phase === PHASE.QUESTION && (
            <div className="w-full max-w-3xl animate-slide-up">
              {/* Question text + timer */}
              <div className="flex items-start justify-between gap-6 mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-white flex-1">{currentQ?.text}</h2>
                <TimerRing timeLeft={timeLeft} total={timeLimit} size={100} />
              </div>

              {/* Answer count bar */}
              <div className="bg-gray-800 rounded-xl p-3 mb-6">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                  <span>Responses</span>
                  <span>{answerCount} / {participants.length}</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500 rounded-full transition-all duration-300"
                    style={{ width: participants.length > 0 ? `${(answerCount / participants.length) * 100}%` : '0%' }} />
                </div>
              </div>

              {/* Options preview */}
              <div className="grid grid-cols-2 gap-3 mb-8">
                {currentQ?.options?.map((opt, i) => (
                  <div key={opt._id} className={`${OPTION_COLORS[i % 4].bg} rounded-xl p-4 flex items-center gap-3`}>
                    <span className="text-white font-bold text-lg">{OPTION_COLORS[i % 4].icon}</span>
                    <span className="text-white font-semibold text-sm flex-1">{opt.text}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all"
                  onClick={() => { stop(); emit('host:reveal') }}>
                  Reveal Answer
                </button>
              </div>
            </div>
          )}

          {phase === PHASE.REVEAL && revealData && (
            <div className="w-full max-w-3xl animate-slide-up">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">{currentQ?.text}</h2>

              <div className="grid grid-cols-2 gap-3 mb-8">
                {currentQ?.options?.map((opt, i) => {
                  const isCorrect = opt._id === revealData.correctOptionId?.toString() ||
                    revealData.options?.find(o => o.optionId?.toString() === opt._id?.toString())?.isCorrect
                  const count = revealData.options?.find(o => o.optionId?.toString() === opt._id?.toString())?.count || 0
                  const total = revealData.options?.reduce((s, o) => s + o.count, 0) || 1

                  return (
                    <div key={opt._id}
                      className={`rounded-xl p-4 transition-all ${isCorrect ? 'ring-4 ring-white bg-green-500' : 'bg-gray-700 opacity-70'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-white font-bold text-lg">{OPTION_COLORS[i % 4].icon}</span>
                        <span className="text-white font-semibold text-sm flex-1">{opt.text}</span>
                        {isCorrect && <span className="text-xl">✓</span>}
                      </div>
                      <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-white/60 rounded-full transition-all duration-700"
                          style={{ width: `${(count / total) * 100}%` }} />
                      </div>
                      <p className="text-white/70 text-xs mt-1">{count} votes</p>
                    </div>
                  )
                })}
              </div>

              <button className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-lg transition-all shadow-brand"
                onClick={() => emit('host:next')}>
                {qIndex + 1 >= qTotal ? 'Show Final Results 🏆' : `Next Question →`}
              </button>
            </div>
          )}
        </div>

        {/* Sidebar leaderboard */}
        <div className="hidden lg:flex flex-col w-72 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
          <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Live Leaderboard</h3>
          {participants.length === 0 ? (
            <p className="text-gray-500 text-sm">No participants yet</p>
          ) : (
            <div className="space-y-2">
              {[...participants].sort((a, b) => b.totalScore - a.totalScore).slice(0, 10).map((p, i) => (
                <div key={p._id || i} className="flex items-center gap-2 px-3 py-2 bg-gray-700 rounded-xl">
                  <span className="text-xs text-gray-400 w-5 text-center font-bold">#{i + 1}</span>
                  <span className="flex-1 text-white text-sm font-medium truncate">{p.nickname}</span>
                  <span className="text-brand-400 text-xs font-bold tabular-nums">{p.totalScore}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
