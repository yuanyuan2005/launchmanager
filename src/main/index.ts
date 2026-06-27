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

  // 首次绘制完成立即显示窗口——HTML 中的 #app-splash 遮罩保证用户看到纯灰底
  // Vue mount + 数据加载完成后，渲染进程会淡出遮罩露出真实内容
  mainWindow.once('ready-to-show', () => {
    showWindow()
  })

  // 渲染进程就绪信号（仅用于日志，窗口已在 ready-to-show 中显示）
  ipcMain.handle(IPC_CHANNELS.RENDERER_READY, () => {
    console.log('[LaunchHub] Renderer ready')
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

  // 窗口在 ready-to-show 时立即显示（#app-splash 遮罩覆盖，无黑屏）
  console.log('[LaunchHub] App ready')
})

app.on('window-all-closed', () => {
  // 不退出应用，隐藏到托盘
})

app.on('before-quit', () => {
  hotkeyManager?.unregister()
  trayManager?.destroy()
})
