import { useEffect, useRef, useCallback, useState } from 'react'
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || ''

export const useSocket = ({ sessionId, role, nickname, token, enabled = true }) => {
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const listenersRef = useRef({})

  useEffect(() => {
    if (!sessionId || !enabled) return

    const socket = io(SOCKET_URL, {
      auth: { sessionId, role, nickname }, // Backend now strictly reads from cookies!
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    })

    socketRef.current = socket
    socket.on('connect',    () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    // Re-attach any listeners registered via on()
    Object.entries(listenersRef.current).forEach(([event, handler]) => {
      socket.on(event, handler)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [sessionId, role, nickname, token, enabled])

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data)
  }, [])

  const on = useCallback((event, handler) => {
    listenersRef.current[event] = handler
    socketRef.current?.on(event, handler)
    return () => {
      delete listenersRef.current[event]
      socketRef.current?.off(event, handler)
    }
  }, [])

  const off = useCallback((event) => {
    delete listenersRef.current[event]
    socketRef.current?.off(event)
  }, [])

  return { emit, on, off, connected, socket: socketRef.current }
}
