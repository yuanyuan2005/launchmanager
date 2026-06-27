import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Project } from '../../main/types'

export const useProjectStore = defineStore('project', () => {
  const projects = ref<Project[]>([])
  const loading = ref(false)
  /** projectId → data URL，由 preloadIcons 填充，ProjectCard 直接读取 */
  const iconDataMap = ref<Record<string, string>>({})

  // ===== 加载 =====
  async function loadProjects(): Promise<void> {
    loading.value = true
    const data = await window.api.getAllProjects()
    if (data) projects.value = data
    loading.value = false
    // 后台预加载图标（不阻塞 UI；各卡片通过 loadIcon 步骤②.5 自行读取磁盘缓存）
    preloadIcons()
  }

  /** 并发预加载所有项目的磁盘缓存图标（每批 6 个） */
  async function preloadIcons(): Promise<void> {
    const needLoad = projects.value.filter(
      p => p.icon && !p.icon.startsWith('data:')
    )
    if (needLoad.length === 0) return

    const CONCURRENCY = 6
    for (let i = 0; i < needLoad.length; i += CONCURRENCY) {
      const batch = needLoad.slice(i, i + CONCURRENCY)
      const results = await Promise.allSettled(
        batch.map(p => window.api.getIconData(p.icon!))
      )
      results.forEach((r, j) => {
        if (r.status === 'fulfilled' && r.value) {
          iconDataMap.value[needLoad[i + j].id] = r.value
        }
      })
    }
  }

  // ===== 添加 =====
  async function addProject(project: { name: string; sourcePath: string; type: string; groupId?: string; tagIds?: string[] }): Promise<Project | null> {
    const result = await window.api.addProject(project)
    if (result) {
      projects.value.push(result)
      // 新项目预加载图标
      if (result.icon && !result.icon.startsWith('data:')) {
        const dataUrl = await window.api.getIconData(result.icon)
        if (dataUrl) iconDataMap.value[result.id] = dataUrl
      }
    }
    return result
  }

  async function addByPath(filePath: string, groupId?: string): Promise<Project | null> {
    const result = await window.api.addProjectByPath(filePath, groupId)
    if (result) {
      projects.value.push(result)
      if (result.icon && !result.icon.startsWith('data:')) {
        const dataUrl = await window.api.getIconData(result.icon)
        if (dataUrl) iconDataMap.value[result.id] = dataUrl
      }
    }
    return result
  }

  // ===== 删除 =====
  async function removeProject(id: string): Promise<boolean> {
    const result = await window.api.removeProject(id)
    if (result) {
      projects.value = projects.value.filter(p => p.id !== id)
    }
    return result
  }

  // ===== 移动分组 =====
  async function moveToGroup(projectId: string, groupId: string): Promise<boolean> {
    const result = await window.api.moveProjectGroup(projectId, groupId)
    if (result) {
      const project = projects.value.find(p => p.id === projectId)
      if (project) project.groupId = groupId
    }
    return result
  }

  // ===== 更新标签 =====
  async function updateTags(projectId: string, tagIds: string[]): Promise<boolean> {
    const result = await window.api.updateProjectTags(projectId, tagIds)
    if (result) {
      const project = projects.value.find(p => p.id === projectId)
      if (project) project.tagIds = tagIds
    }
    return result
  }

  // ===== 启动 =====
  async function launchProject(id: string): Promise<boolean> {
    const result = await window.api.launchProject(id)
    return result?.success ?? false
  }

  // ===== 打开所在文件夹 =====
  async function openFileLocation(id: string): Promise<boolean> {
    const result = await window.api.openFileLocation(id)
    return result?.success ?? false
  }

  // ===== 路径有效性 =====
  async function checkValidity(): Promise<void> {
    const updated = await window.api.checkPathValidity()
    if (updated) projects.value = updated
  }

  // ===== 获取项目 =====
  function getProject(id: string): Project | undefined {
    return projects.value.find(p => p.id === id)
  }

  return {
    projects,
    loading,
    iconDataMap,
    loadProjects,
    preloadIcons,
    addProject,
    addByPath,
    removeProject,
    moveToGroup,
    updateTags,
    launchProject,
    openFileLocation,
    checkValidity,
    getProject
  }
})
