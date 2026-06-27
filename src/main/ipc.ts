import { ipcMain, BrowserWindow, dialog, app, nativeImage } from 'electron'
import { DataStore } from './modules/data-store'
import { ProjectManager } from './modules/project-manager'
import { GroupManager } from './modules/group-manager'
import { TagManager } from './modules/tag-manager'
import { launchProject, openFileLocation } from './modules/launcher'
import { HotkeyManager } from './modules/hotkey-manager'
import { resolveFileIcon } from './modules/icon-resolver'
import { IPC_CHANNELS } from './types'
import { extname, basename, join } from 'path'
import { statSync, readFileSync } from 'fs'

interface IpcContext {
  dataStore: DataStore
  getWindow: () => BrowserWindow | null
  showWindow: () => void
  hideWindow: () => void
  hotkeyManager: HotkeyManager
}

export function registerIpcHandlers(ctx: IpcContext): void {
  const projectManager = new ProjectManager(ctx.dataStore)
  const groupManager = new GroupManager(ctx.dataStore)
  const tagManager = new TagManager(ctx.dataStore)

  // ===== 项目相关 =====

  ipcMain.handle(IPC_CHANNELS.SCAN_DESKTOP, () => {
    return projectManager.scanAndImport()
  })

  ipcMain.handle(IPC_CHANNELS.ADD_PROJECT, (_event, project) => {
    return projectManager.addProject(project)
  })

  ipcMain.handle(IPC_CHANNELS.ADD_PROJECT_BY_PATH, (_event, filePath: string, groupId?: string) => {
    return projectManager.addByPath(filePath, groupId)
  })

  ipcMain.handle(IPC_CHANNELS.REMOVE_PROJECT, (_event, projectId: string) => {
    return projectManager.removeProject(projectId)
  })

  ipcMain.handle(IPC_CHANNELS.GET_ALL_PROJECTS, () => {
    return projectManager.getAll()
  })

  ipcMain.handle(IPC_CHANNELS.LAUNCH_PROJECT, async (_event, projectId: string) => {
    const project = projectManager.getAll().find(p => p.id === projectId)
    if (!project) {
      return { success: false, error: '项目不存在' }
    }
    return launchProject(project.sourcePath)
  })

  ipcMain.handle(IPC_CHANNELS.MOVE_PROJECT_GROUP, (_event, projectId: string, groupId: string) => {
    return projectManager.moveToGroup(projectId, groupId)
  })

  ipcMain.handle(IPC_CHANNELS.UPDATE_PROJECT_TAGS, (_event, projectId: string, tagIds: string[]) => {
    return projectManager.updateTags(projectId, tagIds)
  })

  ipcMain.handle(IPC_CHANNELS.OPEN_FILE_LOCATION, (_event, projectId: string) => {
    const project = projectManager.getAll().find(p => p.id === projectId)
    if (!project) {
      return { success: false, error: '项目不存在' }
    }
    return openFileLocation(project.sourcePath)
  })

  ipcMain.handle(IPC_CHANNELS.CHECK_PATH_VALIDITY, () => {
    projectManager.checkAllValidity()
    return projectManager.getAll()
  })

  // ===== 分组相关 =====

  ipcMain.handle(IPC_CHANNELS.GET_ALL_GROUPS, () => {
    return groupManager.getAll()
  })

  ipcMain.handle(IPC_CHANNELS.CREATE_GROUP, (_event, name: string) => {
    return groupManager.create(name)
  })

  ipcMain.handle(IPC_CHANNELS.RENAME_GROUP, (_event, groupId: string, name: string) => {
    return groupManager.rename(groupId, name)
  })

  ipcMain.handle(IPC_CHANNELS.DELETE_GROUP, (_event, groupId: string) => {
    return groupManager.delete(groupId)
  })

  ipcMain.handle(IPC_CHANNELS.MOVE_GROUP_UP, (_event, groupId: string) => {
    return groupManager.moveUp(groupId) ?? false
  })

  ipcMain.handle(IPC_CHANNELS.MOVE_GROUP_DOWN, (_event, groupId: string) => {
    return groupManager.moveDown(groupId) ?? false
  })

  // ===== 标签相关 =====

  ipcMain.handle(IPC_CHANNELS.GET_ALL_TAGS, () => {
    return tagManager.getAll()
  })

  ipcMain.handle(IPC_CHANNELS.CREATE_TAG, (_event, name: string) => {
    return tagManager.create(name)
  })

  ipcMain.handle(IPC_CHANNELS.RENAME_TAG, (_event, tagId: string, name: string) => {
    return tagManager.rename(tagId, name)
  })

  ipcMain.handle(IPC_CHANNELS.DELETE_TAG, (_event, tagId: string) => {
    return tagManager.delete(tagId)
  })

  // ===== 设置相关 =====

  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => {
    return ctx.dataStore.getSettings()
  })

  ipcMain.handle(IPC_CHANNELS.UPDATE_SETTINGS, (_event, settings) => {
    ctx.dataStore.updateSettings(settings)

    // 实时应用设置
    const win = ctx.getWindow()
    if (win) {
      // 更新窗口尺寸
      if (settings.windowWidth || settings.windowHeight) {
        const bounds = win.getBounds()
        win.setSize(
          settings.windowWidth || bounds.width,
          settings.windowHeight || bounds.height
        )
      }
    }

    // 更新热键
    if (settings.hotkey) {
      ctx.hotkeyManager.register(settings.hotkey)
    }

    return ctx.dataStore.getSettings()
  })

  // ===== 窗口操作 =====

  ipcMain.handle(IPC_CHANNELS.HIDE_WINDOW, () => {
    ctx.hideWindow()
  })

  // ===== 对话框 =====

  ipcMain.handle('dialog:open-file', async () => {
    const win = ctx.getWindow()
    if (!win) return null

    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile', 'openDirectory'],
      title: '选择文件或文件夹',
      filters: [
        { name: '所有文件', extensions: ['*'] },
        { name: '快捷方式', extensions: ['lnk'] }
      ]
    })

    if (result.canceled || result.filePaths.length === 0) return null

    const filePath = result.filePaths[0]
    const ext = extname(filePath).toLowerCase()

    let type: string
    let name: string

    if (ext === '.lnk') {
      type = 'shortcut'
      name = basename(filePath, '.lnk')
    } else {
      // 用 stat 判断是文件还是目录
      try {
        const stat = statSync(filePath)
        if (stat.isDirectory()) {
          type = 'folder'
          name = basename(filePath)
        } else {
          type = 'file'
          name = basename(filePath)
        }
      } catch {
        type = 'file'
        name = basename(filePath)
      }
    }

    return { name, sourcePath: filePath, type }
  })

  // ===== 获取文件真实图标 =====

  ipcMain.handle('get-file-icon', async (_event, filePath: string) => {
    return resolveFileIcon(filePath)
  })

  // ===== 加载已持久化的图标文件（从主进程读取，绕过渲染进程 file:// 限制） =====

  ipcMain.handle('get-icon-data', async (_event, iconFileName: string) => {
    // 安全校验：只允许纯文件名，防止路径穿越
    if (!/^[\w.-]+\.(png|svg)$/.test(iconFileName)) return null
    const iconPath = join(app.getAppPath(), 'icons', iconFileName)

    // SVG 文件：直接读取文本并包装为 data URL
    if (iconFileName.endsWith('.svg')) {
      try {
        const svgText = readFileSync(iconPath, 'utf-8')
        return `data:image/svg+xml,${encodeURIComponent(svgText)}`
      } catch {
        return null
      }
    }

    // PNG 文件：使用 nativeImage 读取并转为 data URL
    const img = nativeImage.createFromPath(iconPath)
    if (img.isEmpty()) return null
    return img.toDataURL()
  })

  // ===== 获取应用数据目录 =====

  ipcMain.handle('get-user-data-path', () => {
    return app.getAppPath()
  })

  // ===== 窗口控制 =====

  ipcMain.handle('win:minimize', () => {
    ctx.getWindow()?.minimize()
  })

  ipcMain.handle('win:maximize', () => {
    const win = ctx.getWindow()
    if (!win) return
    win.isMaximized() ? win.unmaximize() : win.maximize()
  })

  ipcMain.handle('win:close', () => {
    ctx.hideWindow()
  })
}
