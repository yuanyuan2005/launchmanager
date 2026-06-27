import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../main/types'

// 暴露给渲染进程的安全 API
const api = {
  // ===== 项目操作 =====
  scanDesktop: () => ipcRenderer.invoke(IPC_CHANNELS.SCAN_DESKTOP),
  addProject: (project: {
    name: string
    sourcePath: string
    type: string
    groupId?: string
    tagIds?: string[]
  }) => ipcRenderer.invoke(IPC_CHANNELS.ADD_PROJECT, project),
  addProjectByPath: (filePath: string, groupId?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.ADD_PROJECT_BY_PATH, filePath, groupId),
  removeProject: (projectId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.REMOVE_PROJECT, projectId),
  getAllProjects: () => ipcRenderer.invoke(IPC_CHANNELS.GET_ALL_PROJECTS),
  launchProject: (projectId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.LAUNCH_PROJECT, projectId),
  moveProjectGroup: (projectId: string, groupId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.MOVE_PROJECT_GROUP, projectId, groupId),
  updateProjectTags: (projectId: string, tagIds: string[]) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_PROJECT_TAGS, projectId, tagIds),
  openFileLocation: (projectId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.OPEN_FILE_LOCATION, projectId),
  checkPathValidity: () =>
    ipcRenderer.invoke(IPC_CHANNELS.CHECK_PATH_VALIDITY),

  // ===== 批量操作 =====
  removeProjects: (ids: string[]) =>
    ipcRenderer.invoke(IPC_CHANNELS.BATCH_REMOVE_PROJECTS, ids),
  moveProjectsGroup: (ids: string[], groupId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.BATCH_MOVE_PROJECTS_GROUP, ids, groupId),
  batchAddTag: (ids: string[], tagId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.BATCH_ADD_TAG_TO_PROJECTS, ids, tagId),
  batchRemoveTag: (ids: string[], tagId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.BATCH_REMOVE_TAG_FROM_PROJECTS, ids, tagId),

  // ===== 分组操作 =====
  getAllGroups: () => ipcRenderer.invoke(IPC_CHANNELS.GET_ALL_GROUPS),
  createGroup: (name: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_GROUP, name),
  renameGroup: (groupId: string, name: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.RENAME_GROUP, groupId, name),
  deleteGroup: (groupId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_GROUP, groupId),
  moveGroupUp: (groupId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.MOVE_GROUP_UP, groupId),
  moveGroupDown: (groupId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.MOVE_GROUP_DOWN, groupId),

  // ===== 标签操作 =====
  getAllTags: () => ipcRenderer.invoke(IPC_CHANNELS.GET_ALL_TAGS),
  createTag: (name: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_TAG, name),
  renameTag: (tagId: string, name: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.RENAME_TAG, tagId, name),
  deleteTag: (tagId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_TAG, tagId),

  // ===== 设置操作 =====
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),
  updateSettings: (settings: Record<string, unknown>) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_SETTINGS, settings),

  // ===== 对话框操作 =====
  openFileDialog: () => ipcRenderer.invoke('dialog:open-file'),

  // ===== 文件图标 =====
  getFileIcon: (filePath: string) => ipcRenderer.invoke('get-file-icon', filePath),
  getIconData: (iconFileName: string) => ipcRenderer.invoke('get-icon-data', iconFileName),

  // ===== 路径 =====
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),

  // ===== 窗口操作 =====
  hideWindow: () => ipcRenderer.invoke(IPC_CHANNELS.HIDE_WINDOW),
  minimizeWindow: () => ipcRenderer.invoke('win:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('win:maximize'),
  closeWindow: () => ipcRenderer.invoke('win:close'),

  // ===== 应用就绪通知 =====
  notifyReady: () => ipcRenderer.invoke(IPC_CHANNELS.RENDERER_READY),
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
