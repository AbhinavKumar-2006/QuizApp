import { useState, useEffect, useRef, useCallback } from 'react'

export const useCountdown = (initialSeconds, onExpire) => {
  const [timeLeft,   setTimeLeft]   = useState(initialSeconds)
  const [isRunning,  setIsRunning]  = useState(false)
  const intervalRef  = useRef(null)
  const onExpireRef  = useRef(onExpire)
  onExpireRef.current = onExpire

  const clear = () => { clearInterval(intervalRef.current); intervalRef.current = null }

  const start = useCallback((seconds) => {
    clear()
    const total = seconds ?? initialSeconds
    setTimeLeft(total)
    setIsRunning(true)
    const end = Date.now() + total * 1000
    intervalRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.round((end - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining <= 0) {
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
