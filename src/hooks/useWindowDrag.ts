import { useEffect } from 'react'

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

/**
 * 用 CSS -webkit-app-region: drag 实现原生拖拽
 * 比 JS 模拟更稳定，不会触发 resize
 */
export function useWindowDrag() {
  useEffect(() => {
    // 给 body 加 drag 区域，按钮等交互元素通过 no-drag class 排除
    document.body.style.setProperty('-webkit-app-region', 'drag')
    document.body.style.setProperty('user-select', 'none')

    return () => {
      document.body.style.removeProperty('-webkit-app-region')
      document.body.style.removeProperty('user-select')
    }
  }, [])
}
