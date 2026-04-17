import { useEffect, useRef, useState, useCallback } from 'react'

interface UseWebSocketOptions {
  onMessage?: (data: string) => void
  onOpen?: () => void
  onClose?: () => void
  reconnectInterval?: number
}

export function useWebSocket(url: string, options: UseWebSocketOptions = {}) {
  const { onMessage, onOpen, onClose, reconnectInterval = 2000 } = options
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [connected, setConnected] = useState(false)

  const connect = useCallback(() => {
    try {
      ws.current = new WebSocket(url)

      ws.current.onopen = () => {
        setConnected(true)
        onOpen?.()
      }

      ws.current.onmessage = (e) => {
        onMessage?.(e.data)
      }

      ws.current.onclose = () => {
        setConnected(false)
        onClose?.()
        // 自动重连
        reconnectTimer.current = setTimeout(connect, reconnectInterval)
      }

      ws.current.onerror = () => {
        ws.current?.close()
      }
    } catch (e) {
      reconnectTimer.current = setTimeout(connect, reconnectInterval)
    }
  }, [url, onMessage, onOpen, onClose, reconnectInterval])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      ws.current?.close()
    }
  }, [connect])

  const sendMessage = useCallback((data: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(data)
    }
  }, [])

  return { sendMessage, connected }
}
