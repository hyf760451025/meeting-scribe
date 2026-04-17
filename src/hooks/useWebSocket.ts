import { useEffect, useRef, useState, useCallback } from 'react'

interface UseWebSocketOptions {
  onMessage?: (data: string) => void
  onOpen?: () => void
  onClose?: () => void
  reconnectInterval?: number
}

export function useWebSocket(url: string, options: UseWebSocketOptions = {}) {
  const { onMessage, onOpen, onClose, reconnectInterval = 3000 } = options
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  const [connected, setConnected] = useState(false)

  const connect = useCallback(() => {
    if (!mountedRef.current) return
    // 清理旧连接
    if (ws.current) {
      ws.current.onopen = null
      ws.current.onmessage = null
      ws.current.onclose = null
      ws.current.onerror = null
      ws.current.close()
      ws.current = null
    }

    try {
      const socket = new WebSocket(url)
      ws.current = socket

      socket.onopen = () => {
        if (!mountedRef.current) return
        setConnected(true)
        onOpen?.()
      }

      socket.onmessage = (e) => {
        if (!mountedRef.current) return
        onMessage?.(e.data)
      }

      socket.onclose = () => {
        if (!mountedRef.current) return
        setConnected(false)
        onClose?.()
        // 延迟重连
        reconnectTimer.current = setTimeout(() => {
          if (mountedRef.current) connect()
        }, reconnectInterval)
      }

      socket.onerror = () => {
        // onerror 后会触发 onclose，在 onclose 里处理重连
        socket.close()
      }
    } catch {
      reconnectTimer.current = setTimeout(() => {
        if (mountedRef.current) connect()
      }, reconnectInterval)
    }
  }, [url, reconnectInterval])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (ws.current) {
        ws.current.onopen = null
        ws.current.onmessage = null
        ws.current.onclose = null
        ws.current.onerror = null
        ws.current.close()
      }
    }
  }, [connect])

  const sendMessage = useCallback((data: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(data)
    }
  }, [])

  return { sendMessage, connected }
}
