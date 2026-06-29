import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSocket } from '../../hooks/useSocket'
import { useCountdown } from '../../hooks/useCountdown'
import { TimerRing } from '../../components/ui/TimerRing'
import { Leaderboard } from '../../components/ui/Leaderboard'
import { Spinner } from '../../components/ui/Spinner'
import { OPTION_COLORS, MEDAL } from '../../utils/helpers'
import toast from 'react-hot-toast'

const PHASE = { JOINING: 'joining', LOBBY: 'lobby', QUESTION: 'question', ANSWERED: 'answered', REVEAL: 'reveal', ENDED: 'ended' }

const OptionBtn = ({ opt, idx, selected, revealed, isCorrect, disabled, onClick }) => {
  const c = OPTION_COLORS[idx % 4]
  const isSelected = selected === opt._id
  let className = `relative w-full flex items-center gap-4 p-4 rounded-2xl font-semibold text-white text-sm
    transition-all duration-300 cursor-pointer select-none active:scale-95 `

  if (revealed) {
    if (isCorrect) className += 'ring-4 ring-white scale-105 ' + c.bg
    else if (isSelected && !isCorrect) className += 'bg-gray-400 opacity-70 line-through'
    else className += c.bg + ' opacity-40'
  } else if (isSelected) {
    className += c.bg + ' ring-4 ring-white scale-105 shadow-xl'
  } else {
    className += c.bg + (disabled ? ' opacity-60 cursor-not-allowed' : ' hover:scale-102 hover:shadow-lg')
  }

  return (
    <button className={className} onClick={!disabled ? onClick : undefined} disabled={disabled}>
      <div className="w-9 h-9 bg-black/20 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
        {c.icon}
      </div>
      <span className="flex-1 text-left">{opt.text}</span>
      {revealed && isCorrect && <span className="text-2xl">✓</span>}
      {revealed && isSelected && !isCorrect && <span className="text-xl">✗</span>}
    </button>
  )
}

export default function PlaySession() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const nickname = sessionStorage.getItem('nickname')

  const [phase,        setPhase]        = useState(PHASE.JOINING)
  const [question,     setQuestion]     = useState(null)
  const [qIndex,       setQIndex]       = useState(0)
  const [qTotal,       setQTotal]       = useState(0)
  const [timeLimit,    setTimeLimit]    = useState(30)
  const [selected,     setSelected]     = useState(null)
  const [answerResult, setAnswerResult] = useState(null) // { isCorrect, score }
  const [revealData,   setRevealData]   = useState(null)
  const [leaderboard,  setLeaderboard]  = useState([])
  const [myScore,      setMyScore]      = useState(0)
  const [myRank,       setMyRank]       = useState(null)
  const [participants, setParticipants] = useState([])
  const qStartTime     = useRef(null)

  // Redirect if no nickname
  useEffect(() => {
    if (!nickname) navigate(`/join`)
  }, [nickname])

  const { timeLeft, isRunning, start, stop } = useCountdown(30, () => {
    if (phase === PHASE.QUESTION && !selected) {
      setPhase(PHASE.ANSWERED) // timed out
    }
  })

  const { emit, on, connected } = useSocket({ sessionId, role: 'participant', nickname })

  useEffect(() => {
    const unsubs = [
      on('connect', () => {
        emit('participant:join')
      }),

      on('participant:joined', ({ participant }) => {
        setPhase(PHASE.LOBBY)
      }),

      on('session:participants', ({ participants }) => {
        setParticipants(participants)
      }),

      on('session:started', ({ totalQuestions }) => {
        setQTotal(totalQuestions)
      }),

      on('session:question', ({ question, index, total, timeLimit: tl, questionStartedAt }) => {
        setQuestion(question)
        setQIndex(index)
        setQTotal(total)
        setTimeLimit(tl)
        setSelected(null)
        setAnswerResult(null)
        setRevealData(null)
        setPhase(PHASE.QUESTION)
        qStartTime.current = Date.now()
        if (questionStartedAt) {
          const elapsed = (Date.now() - new Date(questionStartedAt).getTime()) / 1000
          const remaining = Math.max(0, tl - elapsed)
          start(tl, remaining)
        } else {
          start(tl)
        }
      }),

      on('participant:answer_result', ({ isCorrect, score, previouslySelected }) => {
        if (previouslySelected) setSelected(previouslySelected)
        setPhase(PHASE.ANSWERED)
        setAnswerResult({ isCorrect, score })
        setMyScore(s => s + score)
        stop()
      }),

      on('session:reveal', ({ correctOptionId, leaderboard }) => {
        setRevealData({ correctOptionId })
        setLeaderboard(leaderboard)
        const me = leaderboard.find(p => p.nickname === nickname)
        if (me) { setMyRank(me.rank) }
        setPhase(PHASE.REVEAL)
      }),

      on('session:ended', ({ finalLeaderboard }) => {
        setLeaderboard(finalLeaderboard)
        const me = finalLeaderboard.find(p => p.nickname === nickname)
        if (me) setMyRank(me.rank)
        stop()
        setPhase(PHASE.ENDED)
      }),

      on('error', ({ message }) => toast.error(message)),
    ]
    return () => unsubs.forEach(fn => fn?.())
  }, [on, emit, start, stop, nickname])

  const handleAnswer = (optionId) => {
    if (selected || phase !== PHASE.QUESTION) return
    const responseTimeMs = Date.now() - qStartTime.current
    setSelected(optionId)
    setPhase(PHASE.ANSWERED)
    emit('participant:answer', { questionId: question._id, selectedOptionId: optionId, responseTimeMs })
  }

  // ── JOINING ──────────────────────────────────────────────────────
  if (phase === PHASE.JOINING) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-600 to-purple-700">
      <div className="text-center text-white animate-pulse">
        <Spinner size="xl" className="text-white mx-auto mb-4" />
        <p className="font-semibold text-lg">Connecting…</p>
      </div>
    </div>
  )

  // ── LOBBY ────────────────────────────────────────────────────────
  if (phase === PHASE.LOBBY) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-brand-600 to-purple-700 p-6 text-white">
      <div className="text-center animate-slide-up max-w-sm w-full">
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 bg-white/20 rounded-full animate-ping" />
          <div className="relative w-24 h-24 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-4xl font-bold">
            {nickname?.[0]?.toUpperCase()}
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-1">You're in! 🎉</h2>
        <p className="text-brand-200 mb-6">Playing as <strong className="text-white">{nickname}</strong></p>

        <div className="bg-white/15 backdrop-blur rounded-2xl p-6 mb-4">
          <div className="flex items-center justify-between text-sm mb-3">
            <span className="text-brand-200 font-medium">Players joined</span>
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          </div>
          <p className="text-4xl font-bold">{participants.length}</p>
        </div>

        <div className="bg-white/10 rounded-xl p-4">
          <p className="text-brand-200 text-sm animate-pulse">⏳ Waiting for host to start…</p>
        </div>
      </div>
    </div>
  )

  // ── ENDED ────────────────────────────────────────────────────────
  if (phase === PHASE.ENDED) {
    const me = leaderboard.find(p => p.nickname === nickname)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-brand-600 to-purple-700 p-6 text-white">
        <div className="w-full max-w-md animate-bounce-in text-center mb-6">
          <p className="text-6xl mb-3">{myRank === 1 ? '🥇' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : '🎉'}</p>
          <h1 className="text-3xl font-bold mb-1">
            {myRank === 1 ? 'You won!' : myRank <= 3 ? `#${myRank} place!` : 'Game over!'}
          </h1>
          <p className="text-brand-200">Final score: <strong className="text-white text-xl">{myScore.toLocaleString()} pts</strong></p>
        </div>
        <div className="bg-white rounded-2xl p-6 w-full max-w-md mb-4 animate-slide-up">
          <Leaderboard entries={leaderboard} highlightNickname={nickname} />
        </div>
        <button className="btn bg-white text-brand-700 font-bold px-8 py-3 rounded-xl hover:bg-brand-50 transition-all"
          onClick={() => navigate('/join')}>
          Play Again
        </button>
      </div>
    )
  }

  // ── QUESTION / ANSWERED / REVEAL ─────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Top bar */}
      <div className="bg-brand-600 text-white px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-brand-200">Question {qIndex + 1} of {qTotal}</p>
          <p className="text-sm font-semibold truncate max-w-[180px]">{nickname}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-brand-200">Score</p>
          <p className="font-bold tabular-nums">{myScore.toLocaleString()}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-brand-800">
        <div className="h-full bg-brand-300 transition-all duration-200"
          style={{ width: `${qTotal > 0 ? ((qIndex + 1) / qTotal) * 100 : 0}%` }} />
      </div>

      <div className="flex-1 flex flex-col p-4 max-w-lg mx-auto w-full">
        {/* Question */}
        <div className="flex items-start justify-between gap-4 mt-4 mb-6">
          <p className="text-lg font-bold text-gray-900 flex-1 leading-snug">{question?.text}</p>
          {phase === PHASE.QUESTION && (
            <div className="flex-shrink-0">
              <TimerRing timeLeft={timeLeft} total={timeLimit} size={72} />
            </div>
          )}
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 gap-3 flex-1">
          {question?.options?.map((opt, i) => (
            <OptionBtn
              key={opt._id} opt={opt} idx={i}
              selected={selected}
              revealed={phase === PHASE.REVEAL}
              isCorrect={revealData?.correctOptionId === opt._id || revealData?.correctOptionId?.toString() === opt._id?.toString()}
              disabled={phase !== PHASE.QUESTION}
              onClick={() => handleAnswer(opt._id)}
            />
          ))}
        </div>

        {/* Feedback after answering */}
        {phase === PHASE.ANSWERED && (
          <div className="mt-4 animate-slide-up">
            {selected ? (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 text-center">
                <p className="text-3xl mb-1">👍</p>
                <p className="font-bold text-blue-700">Answer submitted!</p>
                <p className="text-blue-500 text-sm mt-2 animate-pulse">Waiting for host…</p>
              </div>
            ) : (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 text-center">
                <p className="text-3xl mb-1">⏰</p>
                <p className="font-bold text-amber-700">Time's up!</p>
                <p className="text-amber-500 text-sm mt-2 animate-pulse">Waiting for host…</p>
              </div>
            )}
          </div>
        )}

        {/* Reveal phase leaderboard snippet */}
        {phase === PHASE.REVEAL && (
          <div className="mt-4 animate-slide-up">
            {answerResult && (
              <div className={`rounded-2xl p-5 text-center mb-4 ${answerResult.isCorrect ? 'bg-green-50 border-2 border-green-300' : 'bg-red-50 border-2 border-red-300'}`}>
                <p className="text-3xl mb-1">{answerResult.isCorrect ? '✅' : '❌'}</p>
                <p className={`font-bold text-lg ${answerResult.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                  {answerResult.isCorrect ? 'Correct!' : 'Wrong!'}
                </p>
                {answerResult.isCorrect && (
                  <p className="text-green-600 text-sm font-medium mt-1">+{answerResult.score.toLocaleString()} pts</p>
                )}
              </div>
            )}
            <div className="bg-white rounded-2xl shadow-card p-4">
              <Leaderboard entries={leaderboard.slice(0, 5)} highlightNickname={nickname} title="Leaderboard" />
              {myRank && myRank > 5 && (
                <p className="text-center text-sm text-gray-400 mt-2">You are #{myRank}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
