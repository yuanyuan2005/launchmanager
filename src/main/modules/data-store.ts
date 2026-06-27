import { app } from 'electron'
import { join, dirname } from 'path'
import { readFileSync, writeFileSync, existsSync, renameSync, copyFileSync, unlinkSync, readdirSync, mkdirSync } from 'fs'
import type { AppData, Group, Tag, Project, AppSettings } from '../types'

const DATA_FILE = 'data.json'
const TMP_FILE = 'data.json.tmp'
const BACKUP_PREFIX = 'data.json.backup.'
const MAX_BACKUPS = 3
const ICONS_DIR = 'icons'

function getDataDir(): string {
  // 开发模式：数据文件在项目根目录
  if (!app.isPackaged) {
    return app.getAppPath()
  }

  // 生产模式：优先 exe 同目录（便携版），不可写时回退到 userData（安装版）
  const exeDir = dirname(app.getPath('exe'))
  try {
    // 检测目录是否可写（便携版通常可写，NSIS 安装到 Program Files 不可写）
    const testFile = join(exeDir, '.write_test')
    writeFileSync(testFile, '')
    unlinkSync(testFile)
    return exeDir
  } catch {
    // 不可写（已安装到系统保护目录），回退到 AppData
    console.log('[DataStore] EXE directory not writable, using userData')
    return app.getPath('userData')
  }
}

function defaultData(): AppData {
  return {
    version: '1.0',
    groups: [
      { id: 'grp_default', name: '未分组', isDefault: true, order: 0 }
    ],
    tags: [],
    projects: [],
    settings: {
      hotkey: 'Alt+Space',
      windowWidth: 800,
      windowHeight: 550,
      tagFilterMode: 'intersection'
    }
  }
}

export class DataStore {
  private data: AppData
  private dataDir: string
  private firstRun: boolean

  constructor() {
    this.dataDir = getDataDir()
    this.firstRun = false
    this.data = this.load()
    // 确保图标目录存在
    this.getIconsDir()
  }

  private getPath(filename: string): string {
    return join(this.dataDir, filename)
  }

  private load(): AppData {
    const dataPath = this.getPath(DATA_FILE)

    if (!existsSync(dataPath)) {
      this.firstRun = true
      const defaultD = defaultData()
      this.saveRaw(defaultD)
      return defaultD
    }

    try {
      const raw = readFileSync(dataPath, 'utf-8')
      const parsed = JSON.parse(raw) as AppData

      // 基础校验
      if (!parsed.version || !parsed.groups || !parsed.projects) {
        throw new Error('Invalid data structure')
      }

      // 确保默认分组存在
      if (!parsed.groups.find(g => g.isDefault)) {
        parsed.groups.unshift({ id: 'grp_default', name: '未分组', isDefault: true, order: 0 })
      }
      // 确保所有分组有 order 字段（向前兼容）
      parsed.groups.forEach((g, i) => {
        if (g.order === undefined) g.order = i
      })

      return parsed
    } catch (err) {
      console.error('[DataStore] Failed to load data.json, trying backup...', err)
      return this.recover()
    }
  }

  private recover(): AppData {
    const backups = readdirSync(this.dataDir)
      .filter(f => f.startsWith(BACKUP_PREFIX))
      .sort()
      .reverse()

    for (const backup of backups) {
      try {
        const raw = readFileSync(this.getPath(backup), 'utf-8')
        const parsed = JSON.parse(raw) as AppData
        console.log(`[DataStore] Recovered from ${backup}`)
        this.saveRaw(parsed)
        return parsed
      } catch {
        continue
      }
    }

    console.log('[DataStore] No valid backup found, using defaults')
    this.firstRun = true
    const defaultD = defaultData()
    this.saveRaw(defaultD)
    return defaultD
  }

  private saveRaw(data: AppData): void {
    const dataPath = this.getPath(DATA_FILE)
    const tmpPath = this.getPath(TMP_FILE)

    // 先写临时文件
    writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8')
    // 原子替换
    renameSync(tmpPath, dataPath)
  }

  save(): void {
    // 保留备份
    const dataPath = this.getPath(DATA_FILE)
    const backupPath = this.getPath(`${BACKUP_PREFIX}${Date.now()}`)

    if (existsSync(dataPath)) {
      copyFileSync(dataPath, backupPath)
    }

    this.saveRaw(this.data)

    // 清理旧备份
    this.cleanBackups()
  }

  private cleanBackups(): void {
    const backups = readdirSync(this.dataDir)
      .filter(f => f.startsWith(BACKUP_PREFIX))
      .sort()

    while (backups.length > MAX_BACKUPS) {
      const oldest = backups.shift()!
      try {
        unlinkSync(this.getPath(oldest))
      } catch { /* ignore */ }
    }
  }

  // ===== 通用访问 =====

  getData(): AppData {
    return this.data
  }

  isFirstRun(): boolean {
    return this.firstRun
  }

  // ===== 项目操作 =====

  getProjects(): Project[] {
    return this.data.projects
  }

  addProject(project: Project): void {
    this.data.projects.push(project)
    this.save()
  }

  /** 批量添加项目，仅保存一次 */
  addProjects(projects: Project[]): void {
    this.data.projects.push(...projects)
    this.save()
  }

  removeProject(id: string): void {
    // 删除前先清理图标文件
    const project = this.data.projects.find(p => p.id === id)
    if (project?.icon) {
      this.deleteIconFile(project.icon)
    }

    this.data.projects = this.data.projects.filter(p => p.id !== id)
    this.save()
  }

  /** 获取图标目录路径（不存在则创建） */
  getIconsDir(): string {
    const dir = join(this.dataDir, ICONS_DIR)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    return dir
  }

  /** 删除图标文件（传入 icon 字段值，即 "proj_xxx.png"） */
  deleteIconFile(iconFileName: string): void {
    try {
      const filePath = join(this.dataDir, ICONS_DIR, iconFileName)
      if (existsSync(filePath)) {
        unlinkSync(filePath)
      }
    } catch (err) {
      console.error('[DataStore] 删除图标文件失败:', iconFileName, err)
    }
  }

  updateProject(id: string, updates: Partial<Project>): void {
    const idx = this.data.projects.findIndex(p => p.id === id)
    if (idx !== -1) {
      this.data.projects[idx] = { ...this.data.projects[idx], ...updates }
      this.save()
    }
  }

  /** 批量更新项目有效性（不触发逐条保存，调用方负责最终 save） */
  updateProjectValidity(updates: Map<string, boolean>): void {
    for (const [id, isValid] of updates) {
      const idx = this.data.projects.findIndex(p => p.id === id)
      if (idx !== -1) {
        this.data.projects[idx] = { ...this.data.projects[idx], isValid }
      }
    }
    this.save()
  }

  // ===== 分组操作 =====

  getGroups(): Group[] {
    return this.data.groups
  }

  addGroup(group: Group): void {
    this.data.groups.push(group)
    this.save()
  }

  updateGroup(id: string, updates: Partial<Group>): void {
    const idx = this.data.groups.findIndex(g => g.id === id)
    if (idx !== -1) {
      this.data.groups[idx] = { ...this.data.groups[idx], ...updates }
      this.save()
    }
  }

  removeGroup(id: string): void {
    this.data.groups = this.data.groups.filter(g => g.id !== id)
    this.save()
  }

  reorderGroups(): void {
    this.data.groups.forEach((g, i) => { g.order = i })
    this.save()
  }

  /** 替换整个分组列表（用于排序等批量操作） */
  replaceGroups(groups: Group[]): void {
    this.data.groups = groups
    this.save()
  }

  // ===== 标签操作 =====

  getTags(): Tag[] {
    return this.data.tags
  }

  addTag(tag: Tag): void {
    this.data.tags.push(tag)
    this.save()
  }

  updateTag(id: string, updates: Partial<Tag>): void {
    const idx = this.data.tags.findIndex(t => t.id === id)
    if (idx !== -1) {
      this.data.tags[idx] = { ...this.data.tags[idx], ...updates }
      this.save()
    }
  }

  removeTag(id: string): void {
    // 从所有项目中移除该标签
    this.data.tags = this.data.tags.filter(t => t.id !== id)
    for (const project of this.data.projects) {
      project.tagIds = project.tagIds.filter(tid => tid !== id)
    }
    this.save()
  }

  // ===== 设置操作 =====

  getSettings(): AppSettings {
    return this.data.settings
  }

  updateSettings(updates: Partial<AppSettings>): void {
    this.data.settings = { ...this.data.settings, ...updates }
    this.save()
  }
}
