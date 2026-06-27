// ========== 数据模型类型定义 ==========

/** 项目类型 */
export type ProjectType = 'shortcut' | 'file' | 'folder'

/** 项目实体 */
export interface Project {
  id: string
  name: string
  sourcePath: string
  type: ProjectType
  groupId: string
  tagIds: string[]
  addedTime: string
  isValid: boolean
  /** 缓存的文件图标 data URL（base64 png），拖入/添加时立即获取并持久化 */
  icon?: string
}

/** 分组实体 */
export interface Group {
  id: string
  name: string
  isDefault: boolean
  order: number
}

/** 标签实体 */
export interface Tag {
  id: string
  name: string
}

/** 筛选模式 */
export type FilterMode = 'intersection' | 'union'

/** 应用设置 */
export interface AppSettings {
  hotkey: string
  windowWidth: number
  windowHeight: number
  tagFilterMode: FilterMode
}

/** 完整数据结构 */
export interface AppData {
  version: string
  groups: Group[]
  tags: Tag[]
  projects: Project[]
  settings: AppSettings
}

/** IPC 通道名称 */
export const IPC_CHANNELS = {
  // 项目
  SCAN_DESKTOP: 'scan-desktop',
  ADD_PROJECT: 'add-project',
  ADD_PROJECT_BY_PATH: 'add-project-by-path',
  REMOVE_PROJECT: 'remove-project',
  GET_ALL_PROJECTS: 'get-all-projects',
  LAUNCH_PROJECT: 'launch-project',
  MOVE_PROJECT_GROUP: 'move-project-group',
  UPDATE_PROJECT_TAGS: 'update-project-tags',
  OPEN_FILE_LOCATION: 'open-file-location',
  CHECK_PATH_VALIDITY: 'check-path-validity',
  // 分组
  GET_ALL_GROUPS: 'get-all-groups',
  CREATE_GROUP: 'create-group',
  RENAME_GROUP: 'rename-group',
  DELETE_GROUP: 'delete-group',
  MOVE_GROUP_UP: 'move-group-up',
  MOVE_GROUP_DOWN: 'move-group-down',
  // 标签
  GET_ALL_TAGS: 'get-all-tags',
  CREATE_TAG: 'create-tag',
  RENAME_TAG: 'rename-tag',
  DELETE_TAG: 'delete-tag',
  // 批量操作
  BATCH_REMOVE_PROJECTS: 'batch-remove-projects',
  BATCH_MOVE_PROJECTS_GROUP: 'batch-move-projects-group',
  BATCH_ADD_TAG_TO_PROJECTS: 'batch-add-tag-to-projects',
  BATCH_REMOVE_TAG_FROM_PROJECTS: 'batch-remove-tag-from-projects',
  // 设置
  GET_SETTINGS: 'get-settings',
  UPDATE_SETTINGS: 'update-settings',
  // 窗口
  HIDE_WINDOW: 'hide-window',
  // 应用就绪
  RENDERER_READY: 'renderer-ready',
} as const

/** 应用初始化事件 */
export const APP_EVENTS = {
  DATA_LOADED: 'data-loaded',
  SETTINGS_UPDATED: 'settings-updated',
} as const
