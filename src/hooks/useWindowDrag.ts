import { useEffect, useRef, useCallback } from 'react'

// 扩展 Window 类型，适配 Electron preload 注入的 API
declare global {
  interface Window {
    electronAPI?: {
      moveWindow: (delta: { deltaX: number; deltaY: number }) => void
      resizeWindow: (size: { width: number; height: number }) => void
      getWindowSize: () => Promise<[number, number]>
      onMenuAction: (callback: (action: string) => void) => () => void
    }
  }
}

export function useWindowDrag() {
  const isDragging = useRef(false)
  const startPos = useRef({ x: 0, y: 0 })

  const onMouseDown = useCallback((e: MouseEvent) => {
    // 只响应主按键，且目标不是交互元素
    const target = e.target as HTMLElement
    if (
      e.button !== 0 ||
      target.closest('button, a, input, textarea, select, [data-no-drag]')
    ) return

    isDragging.current = true
    startPos.current = { x: e.screenX, y: e.screenY }
    e.preventDefault()
  }, [])

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return
    const deltaX = e.screenX - startPos.current.x
    const deltaY = e.screenY - startPos.current.y
    startPos.current = { x: e.screenX, y: e.screenY }
    window.electronAPI?.moveWindow({ deltaX, deltaY })
  }, [])

  const onMouseUp = useCallback(() => {
    isDragging.current = false
  }, [])

  useEffect(() => {
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [onMouseDown, onMouseMove, onMouseUp])
}
