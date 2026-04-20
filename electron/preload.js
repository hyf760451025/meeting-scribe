const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  minimizeWindow: (behavior) => ipcRenderer.send('minimize-window', behavior),
  closeWindow: () => ipcRenderer.send('close-window'),
  setOpacity: (opacity) => ipcRenderer.send('set-opacity', opacity),
  resizeWindow: (size) => ipcRenderer.send('resize-window', size),
  getWindowSize: () => ipcRenderer.invoke('get-window-size'),

  // 监听主进程菜单事件
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-action', (_, action) => callback(action))
    return () => ipcRenderer.removeAllListeners('menu-action')
  },
})
