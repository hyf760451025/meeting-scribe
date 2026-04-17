const { app, BrowserWindow, Menu, ipcMain } = require('electron')
const path = require('path')
const { spawn, execSync } = require('child_process')
const net = require('net')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow = null
let pythonProcess = null

// ─── 端口检查 & 清理 ─────────────────────────────────────────────────────────
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(true))
    server.once('listening', () => {
      server.close()
      resolve(false)
    })
    server.listen(port, '127.0.0.1')
  })
}

function killPortWin(port) {
  try {
    const result = execSync(
      `netstat -ano | findstr :${port}`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    )
    const pids = new Set()
    result.split('\n').forEach((line) => {
      const match = line.trim().match(/(\d+)$/)
      if (match) pids.add(match[1])
    })
    pids.forEach((pid) => {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' })
        console.log(`[Main] 已清理端口 ${port} 占用进程 PID=${pid}`)
      } catch {}
    })
  } catch {}
}

async function cleanupPorts() {
  const ports = [8766, 8767]
  for (const port of ports) {
    if (await isPortInUse(port)) {
      console.log(`[Main] 端口 ${port} 被占用，尝试清理...`)
      if (process.platform === 'win32') {
        killPortWin(port)
      }
      // 等待端口释放
      await new Promise((r) => setTimeout(r, 500))
    }
  }
}

// ─── 启动 Python 后端 ────────────────────────────────────────────────────────
function startPython() {
  const pythonPath = isDev
    ? path.join(__dirname, '../python/main.py')
    : path.join(process.resourcesPath, 'python/main.py')

  const candidates = process.platform === 'win32'
    ? ['py', 'python', 'python3']
    : ['python3', 'python']

  function tryNext(list) {
    if (list.length === 0) {
      console.error('[Python] 找不到 Python，请确认已安装并加入 PATH')
      return
    }
    const cmd = list[0]
    const proc = spawn(cmd, [pythonPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    proc.on('error', () => {
      console.warn(`[Python] "${cmd}" 不可用，尝试下一个...`)
      tryNext(list.slice(1))
    })

    proc.stdout.on('data', (data) => {
      console.log('[Python]', data.toString().trim())
    })

    proc.stderr.on('data', (data) => {
      console.error('[Python Error]', data.toString().trim())
    })

    proc.on('close', (code) => {
      if (code !== null) {
        console.log(`[Python] 进程退出，code: ${code}`)
      }
    })

    pythonProcess = proc
  }

  tryNext(candidates)
}

function killPython() {
  if (pythonProcess) {
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /PID ${pythonProcess.pid} /T /F`, { stdio: 'ignore' })
      } else {
        pythonProcess.kill('SIGTERM')
      }
    } catch {}
    pythonProcess = null
  }
}

// ─── 创建主窗口 ──────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 720,
    height: 160,
    minWidth: 400,
    minHeight: 100,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.webContents.on('context-menu', () => {
    buildContextMenu().popup({ window: mainWindow })
  })
}

// ─── 右键菜单 ────────────────────────────────────────────────────────────────
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
ipcMain.handle('get-window-size', () => {
  return mainWindow?.getSize() ?? [720, 160]
})

// ─── App 生命周期 ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // 先清理可能残留的端口占用
  await cleanupPorts()
  startPython()
  setTimeout(createWindow, 1500)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  killPython()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  killPython()
})
