import { DataStore } from './data-store'
import { scanDesktop, createProjectFromPath, checkPathValid, generateId } from './desktop-scanner'
import { resolveFileIcon, saveIconToDisk } from './icon-resolver'
import type { Project } from '../types'

export class ProjectManager {
  private store: DataStore

  constructor(store: DataStore) {
    this.store = store
  }

  /** 扫描桌面并导入所有项目到"未分组"（并发获取图标，每批 4 个） */
  async scanAndImport(): Promise<Project[]> {
    const results = scanDesktop()
    const existingPaths = new Set(this.store.getProjects().map(p => p.sourcePath))
    const defaultGroup = this.store.getGroups().find(g => g.isDefault)!

    // 过滤出未导入的项目
    const newItems = results.filter(item => !existingPaths.has(item.sourcePath))
    if (newItems.length === 0) return []

    // 先创建所有项目对象（不含图标）
    const projects: Project[] = newItems.map(item => ({
      id: generateId('proj'),
      name: item.name,
      sourcePath: item.sourcePath,
      type: item.type,
      groupId: defaultGroup.id,
      tagIds: [],
      addedTime: new Date().toISOString(),
      isValid: true
    }))

    // 并发获取图标，每批最多 4 个并行
    const CONCURRENCY = 4
    for (let i = 0; i < projects.length; i += CONCURRENCY) {
      const batch = projects.slice(i, i + CONCURRENCY)
      await Promise.allSettled(
        batch.map(async (project) => {
          const dataUrl = await resolveFileIcon(project.sourcePath)
          if (dataUrl) {
            const iconFile = saveIconToDisk(dataUrl, this.store.getIconsDir(), project.id)
            if (iconFile) project.icon = iconFile
          }
        })
      )
    }

    // 批量写入 store，仅保存一次 data.json
    this.store.addProjects(projects)

    return projects
  }

  /** 通过路径添加项目（拖入时调用）—— 获取图标并持久化到磁盘 */
  async addByPath(filePath: string, groupId?: string): Promise<Project | null> {
    const defaultGroup = this.store.getGroups().find(g => g.isDefault)!
    const targetGroup = groupId || defaultGroup.id

    // 检查组是否有效
    const group = this.store.getGroups().find(g => g.id === targetGroup)
    if (!group) return null

    const project = createProjectFromPath(filePath, targetGroup)
    if (!project) return null

    // 获取图标并持久化到磁盘
    const dataUrl = await resolveFileIcon(filePath)
    if (dataUrl) {
      const iconFile = saveIconToDisk(dataUrl, this.store.getIconsDir(), project.id)
      if (iconFile) project.icon = iconFile
    }

    this.store.addProject(project)
    return project
  }

  /** 手动添加项目 —— 获取图标并持久化到磁盘 */
  async addProject(project: Omit<Project, 'id' | 'addedTime' | 'isValid' | 'icon'>): Promise<Project> {
    const newProject: Project = {
      ...project,
      id: generateId('proj'),
      addedTime: new Date().toISOString(),
      isValid: checkPathValid(project.sourcePath)
    }

    // 获取图标并持久化到磁盘
    const dataUrl = await resolveFileIcon(project.sourcePath)
    if (dataUrl) {
      const iconFile = saveIconToDisk(dataUrl, this.store.getIconsDir(), newProject.id)
      if (iconFile) newProject.icon = iconFile
    }

    this.store.addProject(newProject)
    return newProject
  }

  /** 删除项目（不删除源文件，但清理图标缓存） */
  removeProject(id: string): boolean {
    const project = this.store.getProjects().find(p => p.id === id)
    if (!project) return false
    // DataStore.removeProject 内部会清理图标文件
    this.store.removeProject(id)
    return true
  }

  /** 获取所有项目 */
  getAll(): Project[] {
    return this.store.getProjects()
  }

  /** 移动项目到其他分组 */
  moveToGroup(projectId: string, groupId: string): boolean {
    const project = this.store.getProjects().find(p => p.id === projectId)
    const group = this.store.getGroups().find(g => g.id === groupId)
    if (!project || !group) return false

    this.store.updateProject(projectId, { groupId })
    return true
  }

  /** 更新项目标签 */
  updateTags(projectId: string, tagIds: string[]): boolean {
    const project = this.store.getProjects().find(p => p.id === projectId)
    if (!project) return false

    this.store.updateProject(projectId, { tagIds })
    return true
  }

  // ===== 批量操作 =====

  /** 批量删除 */
  batchRemoveProjects(ids: string[]): boolean {
    if (!ids || ids.length === 0) return false
    this.store.batchRemoveProjects(ids)
    return true
  }

  /** 批量移动到分组 */
  batchMoveToGroup(ids: string[], groupId: string): boolean {
    if (!ids || ids.length === 0) return false
    const group = this.store.getGroups().find(g => g.id === groupId)
    if (!group) return false
    this.store.batchMoveToGroup(ids, groupId)
    return true
  }

  /** 批量添加标签 */
  batchAddTag(ids: string[], tagId: string): boolean {
    if (!ids || ids.length === 0) return false
    this.store.batchAddTag(ids, tagId)
    return true
  }

  /** 批量移除标签 */
  batchRemoveTag(ids: string[], tagId: string): boolean {
    if (!ids || ids.length === 0) return false
    this.store.batchRemoveTag(ids, tagId)
    return true
  }

  /** 检查所有项目路径有效性（批量更新，只保存一次） */
  checkAllValidity(): void {
    const projects = this.store.getProjects()
    const updates = new Map<string, boolean>()

    for (const project of projects) {
      const isValid = checkPathValid(project.sourcePath)
      if (project.isValid !== isValid) {
        updates.set(project.id, isValid)
      }
    }

    if (updates.size > 0) {
      this.store.updateProjectValidity(updates)
    }
  }
}
