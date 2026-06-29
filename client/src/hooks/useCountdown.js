import { useState, useEffect, useRef, useCallback } from 'react'

export const useCountdown = (initialSeconds, onExpire) => {
  const [timeLeft,   setTimeLeft]   = useState(initialSeconds)
  const [isRunning,  setIsRunning]  = useState(false)
  const intervalRef  = useRef(null)
  const onExpireRef  = useRef(onExpire)
  onExpireRef.current = onExpire

  const clear = () => { clearInterval(intervalRef.current); intervalRef.current = null }

  const start = useCallback((seconds, remainingSeconds) => {
    clear()
    const total = seconds ?? initialSeconds
    const remaining = remainingSeconds ?? total
    setTimeLeft(remaining)
    setIsRunning(true)
    const end = Date.now() + remaining * 1000
    intervalRef.current = setInterval(() => {
      const rem = Math.max(0, Math.round((end - Date.now()) / 1000))
      setTimeLeft(rem)
      if (rem <= 0) {
        clear()
        setIsRunning(false)
        onExpireRef.current?.()
      }
    }, 200)
  }, [initialSeconds])

  const stop = useCallback(() => { clear(); setIsRunning(false) }, [])
  const reset = useCallback((s) => { clear(); setTimeLeft(s ?? initialSeconds); setIsRunning(false) }, [initialSeconds])

  useEffect(() => () => clear(), [])

  return { timeLeft, isRunning, start, stop, reset }
}
