import { computed } from 'vue'
import { useProjectStore } from '../stores/project-store'
import { useUiStore } from '../stores/ui-store'
import type { Project } from '../../main/types'

export function useProjects() {
  const projectStore = useProjectStore()
  const uiStore = useUiStore()

  /** 筛选后的项目列表 */
  const filteredProjects = computed<Project[]>(() => {
    let result = projectStore.projects

    // 分组筛选
    if (uiStore.activeGroupId !== null) {
      result = result.filter(p => p.groupId === uiStore.activeGroupId)
    }

    // 标签筛选
    const selectedTags = [...uiStore.selectedTagIds]
    if (selectedTags.length > 0) {
      if (uiStore.filterMode === 'intersection') {
        result = result.filter(p => selectedTags.every(tid => p.tagIds.includes(tid)))
      } else {
        result = result.filter(p => selectedTags.some(tid => p.tagIds.includes(tid)))
      }
    }

    // 搜索过滤
    const query = uiStore.searchQuery.toLowerCase().trim()
    if (query) {
      result = result.filter(p => p.name.toLowerCase().includes(query))
    }

    return result
  })

  /** 按分组统计 */
  const projectCountByGroup = computed(() => {
    const map: Record<string, number> = {}
    for (const p of projectStore.projects) {
      map[p.groupId] = (map[p.groupId] || 0) + 1
    }
    return map
  })

  async function launch(id: string): Promise<boolean> {
    return projectStore.launchProject(id)
  }

  async function remove(id: string): Promise<boolean> {
    return projectStore.removeProject(id)
  }

  return {
    projects: projectStore.projects,
    filteredProjects,
    projectCountByGroup,
    loading: projectStore.loading,
    launch,
    remove,
    loadProjects: projectStore.loadProjects,
    addProject: projectStore.addProject,
    addByPath: projectStore.addByPath,
    moveToGroup: projectStore.moveToGroup,
    updateTags: projectStore.updateTags,
    openFileLocation: projectStore.openFileLocation,
    checkValidity: projectStore.checkValidity,
    getProject: projectStore.getProject
  }
}
