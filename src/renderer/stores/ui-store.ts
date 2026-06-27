import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FilterMode } from '../../main/types'

export const useUiStore = defineStore('ui', () => {
  // 当前选中的分组 ID（null = "全部"）
  const activeGroupId = ref<string | null>(null)

  // 搜索关键词
  const searchQuery = ref('')

  // 选中的标签 ID 集合
  const selectedTagIds = ref<Set<string>>(new Set())

  // 标签筛选模式
  const filterMode = ref<FilterMode>('intersection')

  // 对话框开关
  const showAddProjectDialog = ref(false)
  const showGroupEditDialog = ref(false)
  const showTagEditDialog = ref(false)
  const showSettingsDialog = ref(false)

  // 右键菜单
  const contextMenu = ref<{
    visible: boolean
    x: number
    y: number
    projectId: string | null
  }>({
    visible: false,
    x: 0,
    y: 0,
    projectId: null
  })

  // 编辑中的分组/标签
  const editingGroup = ref<{ id: string; name: string } | null>(null)
  const editingTag = ref<{ id: string; name: string } | null>(null)

  // ===== 标签筛选操作 =====
  function toggleTag(tagId: string): void {
    const newSet = new Set(selectedTagIds.value)
    if (newSet.has(tagId)) {
      newSet.delete(tagId)
    } else {
      newSet.add(tagId)
    }
    selectedTagIds.value = newSet
  }

  function toggleFilterMode(): void {
    filterMode.value = filterMode.value === 'intersection' ? 'union' : 'intersection'
  }

  function clearTagFilter(): void {
    selectedTagIds.value = new Set()
  }

  // ===== 右键菜单 =====
  function showContextMenu(projectId: string, x: number, y: number): void {
    contextMenu.value = { visible: true, x, y, projectId }
  }

  function hideContextMenu(): void {
    contextMenu.value = { visible: false, x: 0, y: 0, projectId: null }
  }

  // ===== 对话框 =====
  function openAddProjectDialog(): void {
    showAddProjectDialog.value = true
  }

  function closeAddProjectDialog(): void {
    showAddProjectDialog.value = false
  }

  function openGroupEditDialog(group?: { id: string; name: string }): void {
    editingGroup.value = group || null
    showGroupEditDialog.value = true
  }

  function closeGroupEditDialog(): void {
    showGroupEditDialog.value = false
    editingGroup.value = null
  }

  function openTagEditDialog(tag?: { id: string; name: string }): void {
    editingTag.value = tag || null
    showTagEditDialog.value = true
  }

  function closeTagEditDialog(): void {
    showTagEditDialog.value = false
    editingTag.value = null
  }

  return {
    activeGroupId,
    searchQuery,
    selectedTagIds,
    filterMode,
    showAddProjectDialog,
    showGroupEditDialog,
    showTagEditDialog,
    showSettingsDialog,
    contextMenu,
    editingGroup,
    editingTag,
    toggleTag,
    toggleFilterMode,
    clearTagFilter,
    showContextMenu,
    hideContextMenu,
    openAddProjectDialog,
    closeAddProjectDialog,
    openGroupEditDialog,
    closeGroupEditDialog,
    openTagEditDialog,
    closeTagEditDialog
  }
})
