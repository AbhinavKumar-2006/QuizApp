import { MEDAL } from '../../utils/helpers'

export const Leaderboard = ({ entries = [], highlightNickname, title = 'Leaderboard' }) => (
  <div className="w-full">
    {title && <h3 className="text-base font-semibold text-gray-700 mb-3">{title}</h3>}
    {entries.length === 0 ? (
      <p className="text-center text-gray-400 py-8 text-sm">No scores yet</p>
    ) : (
      <div className="space-y-2">
        {entries.map((p, i) => {
          const isMe = highlightNickname && p.nickname === highlightNickname
          return (
            <div
              key={p._id || i}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                ${isMe ? 'bg-brand-600 text-white shadow-brand' : 'bg-gray-50 hover:bg-gray-100'}`}
            >
              <span className="text-xl w-7 text-center">
                {i < 3 ? MEDAL[i] : <span className={`text-sm font-bold ${isMe ? 'text-white' : 'text-gray-400'}`}>#{i + 1}</span>}
              </span>
              <span className={`flex-1 font-semibold truncate text-sm ${isMe ? 'text-white' : 'text-gray-800'}`}>
                {p.nickname} {isMe && <span className="text-xs opacity-75">(you)</span>}
              </span>
              {!p.isConnected && (
                <span className="text-xs opacity-60">disconnected</span>
              )}
              <span className={`font-bold tabular-nums text-sm ${isMe ? 'text-white' : 'text-brand-600'}`}>
                {p.totalScore.toLocaleString()} pts
              </span>
            </div>
          )
        })}
      </div>
    )}
  </div>
)
