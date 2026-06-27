import { app, BrowserWindow, screen, ipcMain } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipc'
import { DataStore } from './modules/data-store'
import { HotkeyManager } from './modules/hotkey-manager'
import { TrayManager } from './modules/tray-manager'
import { APP_EVENTS, IPC_CHANNELS } from './types'

let mainWindow: BrowserWindow | null = null
let dataStore: DataStore
let hotkeyManager: HotkeyManager
let trayManager: TrayManager

function createWindow(): void {
  const { windowWidth: width, windowHeight: height } = dataStore.getSettings()

  mainWindow = new BrowserWindow({
    width,
    height,
    show: false,
    frame: false,
    transparent: false,
    resizable: true,
    skipTaskbar: true,
    alwaysOnTop: false,
    backgroundColor: '#f8f9fa',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // ready-to-show 仅作为兜底：启动 5s 超时，防止 renderer 崩溃导致窗口永远不显示
  let rendererReady = false
  let fallbackTimer: ReturnType<typeof setTimeout> | null = null

  mainWindow.once('ready-to-show', () => {
    fallbackTimer = setTimeout(() => {
      if (!rendererReady) {
        console.log('[LaunchHub] Renderer did not signal ready within 5s, showing via fallback')
        showWindow()
      }
    }, 5000)
  })

  // 收到 renderer 就绪信号后立即显示窗口（消除 dev 模式下 Vite 编译期的黑/白屏）
  ipcMain.handle(IPC_CHANNELS.RENDERER_READY, () => {
    if (!rendererReady) {
      rendererReady = true
      if (fallbackTimer) {
        clearTimeout(fallbackTimer)
        fallbackTimer = null
      }
      showWindow()
    }
  })

  // 开发模式加载 dev server，生产模式加载文件
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // 尽早设置背景色，防止 Windows 上 frameless 窗口初始化时的黑屏
  mainWindow.setBackgroundColor('#f8f9fa')
  mainWindow.setMenuBarVisibility(false)
}

function showWindow(): void {
  if (!mainWindow) return

  // 获取鼠标所在屏幕
  const cursorPoint = screen.getCursorScreenPoint()
  const currentDisplay = screen.getDisplayNearestPoint(cursorPoint)
  const { x, y, width: screenW, height: screenH } = currentDisplay.workArea

  // 居中到鼠标所在屏幕
  const bounds = mainWindow.getBounds()
  const winX = Math.round(x + (screenW - bounds.width) / 2)
  const winY = Math.round(y + (screenH - bounds.height) / 2)

  mainWindow.setPosition(winX, winY)
  // 显式设置背景色，消除 Windows frameless 窗口 show() 时的黑屏闪烁
  mainWindow.setBackgroundColor('#f8f9fa')
  mainWindow.show()
  mainWindow.focus()
  hotkeyManager?.setVisible(true)
}

function hideWindow(): void {
  mainWindow?.hide()
  hotkeyManager?.setVisible(false)
}

// ========== 应用生命周期 ==========

app.whenReady().then(() => {
  // 初始化数据存储
  dataStore = new DataStore()

  // 创建窗口
  createWindow()

  // 注册全局热键（必须在 registerIpcHandlers 之前，因为 settings 更新需要 hotkeyManager）
  hotkeyManager = new HotkeyManager(showWindow, hideWindow)
  const settings = dataStore.getSettings()
  hotkeyManager.register(settings.hotkey)

  // 注册 IPC 处理
  registerIpcHandlers({
    dataStore,
    getWindow: () => mainWindow,
    showWindow,
    hideWindow,
    hotkeyManager
  })

  // 创建系统托盘
  trayManager = new TrayManager(showWindow, () => {
    app.quit()
  })

  // 首次运行：自动扫描桌面
  if (dataStore.isFirstRun()) {
    console.log('[LaunchHub] First run detected, scanning desktop...')
  }

  // 监听设置变更更新热键
  ipcMain.on(APP_EVENTS.SETTINGS_UPDATED, (_event, settings) => {
    if (settings.hotkey) {
      hotkeyManager.register(settings.hotkey)
    }
  })

  // 窗口将在 renderer 发送 RENDERER_READY 信号后显示（ready-to-show 作为 5s 超时兜底）
  console.log('[LaunchHub] App ready')
})

app.on('window-all-closed', () => {
  // 不退出应用，隐藏到托盘
})

app.on('before-quit', () => {
  hotkeyManager?.unregister()
  trayManager?.destroy()
})
