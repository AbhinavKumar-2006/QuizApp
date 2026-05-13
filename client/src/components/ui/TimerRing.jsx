export const TimerRing = ({ timeLeft, total, size = 120 }) => {
  const r = 42
  const circumference = 2 * Math.PI * r
  const progress = total > 0 ? timeLeft / total : 0
  const offset = circumference * (1 - progress)

  const color = progress > 0.5 ? '#6171f5' : progress > 0.25 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.2s linear, stroke 0.5s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-gray-900" style={{ color }}>{timeLeft}</span>
        <span className="text-xs text-gray-400 font-medium">sec</span>
      </div>
    </div>
  )
}
