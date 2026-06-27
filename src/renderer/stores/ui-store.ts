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

  // ===== 多选状态 =====
  const selectedProjectIds = ref<Set<string>>(new Set())
  const lastClickedIndex = ref<number | null>(null)

  const selectionCount = computed(() => selectedProjectIds.value.size)

  function isSelected(id: string): boolean {
    return selectedProjectIds.value.has(id)
  }

  function toggleSelect(id: string, index: number): void {
    const newSet = new Set(selectedProjectIds.value)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    selectedProjectIds.value = newSet
    lastClickedIndex.value = index
  }

  function rangeSelect(fromIndex: number, toIndex: number, visibleIds: string[]): void {
    const newSet = new Set(selectedProjectIds.value)
    const start = Math.min(fromIndex, toIndex)
    const end = Math.max(fromIndex, toIndex)
    for (let i = start; i <= end; i++) {
      if (i >= 0 && i < visibleIds.length) {
        newSet.add(visibleIds[i])
      }
    }
    selectedProjectIds.value = newSet
    // lastClickedIndex 保持在 range 的起始点，继续 Shift+Click 时从原锚点扩展
  }

  function selectAll(visibleIds: string[]): void {
    selectedProjectIds.value = new Set(visibleIds)
    lastClickedIndex.value = null
  }

  function clearSelection(): void {
    selectedProjectIds.value = new Set()
    lastClickedIndex.value = null
  }

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
    // 多选
    selectedProjectIds,
    lastClickedIndex,
    selectionCount,
    isSelected,
    toggleSelect,
    rangeSelect,
    selectAll,
    clearSelection,
    // 标签筛选
    toggleTag,
    toggleFilterMode,
    clearTagFilter,
    // 右键菜单
    showContextMenu,
    hideContextMenu,
    // 对话框
    openAddProjectDialog,
    closeAddProjectDialog,
    openGroupEditDialog,
    closeGroupEditDialog,
    openTagEditDialog,
    closeTagEditDialog
  }
})
