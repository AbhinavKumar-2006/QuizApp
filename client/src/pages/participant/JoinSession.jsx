import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { sessionApi } from '../../api/services'
import { getErrorMessage } from '../../utils/helpers'
import toast from 'react-hot-toast'

export default function JoinSession() {
  const navigate = useNavigate()
  const [code,    setCode]    = useState('')
  const [nickname, setNickname] = useState('')
  const [step,    setStep]    = useState(1) // 1=code, 2=nickname
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleCodeSubmit = async (e) => {
    e.preventDefault()
    if (code.trim().length < 4) { toast.error('Enter a valid join code'); return }
    setLoading(true)
    try {
      const { data } = await sessionApi.lookupCode(code.trim())
      setSession(data.session)
      setStep(2)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = (e) => {
    e.preventDefault()
    if (!nickname.trim()) { toast.error('Enter a nickname'); return }
    // Store nickname in sessionStorage for PlaySession to pick up
    sessionStorage.setItem('nickname', nickname.trim())
    navigate(`/sessions/${session._id}/play`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-600 to-purple-700 p-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur rounded-3xl mb-4">
            <span className="text-4xl">⚡</span>
          </div>
          <h1 className="text-4xl font-bold text-white">QuizLive</h1>
          <p className="text-brand-200 mt-1">Join a live quiz</p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          {step === 1 ? (
            <form onSubmit={handleCodeSubmit} className="space-y-5">
              <div>
                <label className="label text-gray-700">Enter game code</label>
                <input
                  className="input text-center text-3xl font-bold tracking-widest uppercase placeholder-gray-300 py-4"
                  placeholder="ABC123"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                  maxLength={6}
                  autoFocus
                />
              </div>
              <button type="submit" className="btn-primary btn-xl w-full" disabled={loading}>
                {loading ? 'Checking…' : 'Find Game'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-5">
              <div className="text-center pb-2 border-b border-gray-100">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Joining</p>
                <p className="font-bold text-gray-900 text-lg">{session?.quiz?.title}</p>
              </div>
              <div>
                <label className="label">Your nickname</label>
                <input
                  className="input text-center text-xl font-semibold"
                  placeholder="e.g. SuperQuizzer"
                  value={nickname}
                  onChange={e => setNickname(e.target.value.slice(0, 30))}
                  maxLength={30}
                  autoFocus
                />
              </div>
              <button type="submit" className="btn-primary btn-xl w-full">
                Join Game 🚀
              </button>
              <button type="button" className="btn-ghost btn-md w-full text-gray-400"
                onClick={() => { setStep(1); setSession(null) }}>
                ← Change code
              </button>
            </form>
          )}

          <p className="text-center text-xs text-gray-400 mt-6">
            Are you a host?{' '}
            <Link to="/login" className="text-brand-600 font-medium hover:underline">Sign in here</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
