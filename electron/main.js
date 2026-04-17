const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron')
const path = require('path')
const { spawn } = require('child_process')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow = null
let pythonProcess = null

// ─── 启动 Python 后端 ───────────────────────────────────────────────────────
function startPython() {
  const pythonPath = isDev
    ? path.join(__dirname, '../python/main.py')
    : path.join(process.resourcesPath, 'python/main.py')

  const python = process.platform === 'win32' ? 'python' : 'python3'

  pythonProcess = spawn(python, [pythonPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  pythonProcess.stdout.on('data', (data) => {
    console.log('[Python]', data.toString())
  })

  pythonProcess.stderr.on('data', (data) => {
    console.error('[Python Error]', data.toString())
  })

  pythonProcess.on('close', (code) => {
    console.log('[Python] 进程退出，code:', code)
  })
}

// ─── 创建主窗口 ─────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 720,
    height: 160,
    minWidth: 400,
    minHeight: 100,
    frame: false,               // 无边框
    transparent: true,          // 透明背景
    alwaysOnTop: true,          // 始终置顶
    resizable: true,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // 开发模式加载 Vite dev server，生产模式加载打包文件
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    // mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // 注册右键菜单
  mainWindow.webContents.on('context-menu', () => {
    buildContextMenu().popup({ window: mainWindow })
  })
}

// ─── 右键菜单 ───────────────────────────────────────────────────────────────
function buildContextMenu() {
  return Menu.buildFromTemplate([
    {
      label: '▶  开始录音',
      click: () => mainWindow?.webContents.send('menu-action', 'start'),
    },
    {
      label: '⏹  停止录音',
      click: () => mainWindow?.webContents.send('menu-action', 'stop'),
    },
    { type: 'separator' },
    {
      label: '📄  查看完整逐字稿',
      click: () => mainWindow?.webContents.send('menu-action', 'show-transcript'),
    },
    {
      label: '✨  生成智能总结',
      click: () => mainWindow?.webContents.send('menu-action', 'summarize'),
    },
    { type: 'separator' },
    {
      label: '⚙️  设置',
      click: () => mainWindow?.webContents.send('menu-action', 'settings'),
    },
    { type: 'separator' },
    {
      label: '✕  退出',
      click: () => app.quit(),
    },
  ])
}

// ─── IPC 通信 ────────────────────────────────────────────────────────────────
// 窗口拖动（无边框窗口需要手动实现）
ipcMain.on('window-move', (_, { deltaX, deltaY }) => {
  if (!mainWindow) return
  const [x, y] = mainWindow.getPosition()
  mainWindow.setPosition(x + deltaX, y + deltaY)
})

// 获取窗口大小（供前端使用）
ipcMain.handle('get-window-size', () => {
  return mainWindow?.getSize() ?? [720, 160]
})

// 调整窗口高度（展开/收起）
ipcMain.on('resize-window', (_, { width, height }) => {
  mainWindow?.setSize(width, height, true)
})

// ─── App 生命周期 ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  startPython()
  // 等待 Python 启动
  setTimeout(createWindow, 1500)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (pythonProcess) {
    pythonProcess.kill()
  }
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (pythonProcess) {
    pythonProcess.kill()
  }
})
