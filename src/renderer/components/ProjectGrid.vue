<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useProjectStore } from '../stores/project-store'
import { useGroupStore } from '../stores/group-store'
import { useUiStore } from '../stores/ui-store'
import ProjectCard from './ProjectCard.vue'

const projectStore = useProjectStore()
const groupStore = useGroupStore()
const uiStore = useUiStore()

// 拖拽悬停（用计数器防闪烁）
const dragCounter = ref(0)
const isDragOver = ref(false)

const gridRef = ref<HTMLElement | null>(null)

/** 根据分组、标签、搜索词筛选后的项目列表 */
const filteredProjects = computed(() => {
  let result = projectStore.projects

  // 按分组筛选
  if (uiStore.activeGroupId !== null) {
    result = result.filter(p => p.groupId === uiStore.activeGroupId)
  }

  // 按标签筛选
  const selectedTags = [...uiStore.selectedTagIds]
  if (selectedTags.length > 0) {
    if (uiStore.filterMode === 'intersection') {
      result = result.filter(p =>
        selectedTags.every(tagId => p.tagIds.includes(tagId))
      )
    } else {
      result = result.filter(p =>
        selectedTags.some(tagId => p.tagIds.includes(tagId))
      )
    }
  }

  // 按搜索词筛选
  const query = uiStore.searchQuery.toLowerCase().trim()
  if (query) {
    result = result.filter(p =>
      p.name.toLowerCase().includes(query)
    )
  }

  return result
})

const visibleIds = computed(() => filteredProjects.value.map(p => p.id))

/** 当前分组名 */
const currentGroupName = computed(() => {
  if (uiStore.activeGroupId === null) return '全部项目'
  return groupStore.groups.find(g => g.id === uiStore.activeGroupId)?.name || '未知分组'
})

function onLaunch(projectId: string): void {
  projectStore.launchProject(projectId)
}

// ===== 右键菜单（多选感知） =====
function onContextMenu(event: { projectId: string; x: number; y: number }): void {
  const isInSelection = uiStore.selectedProjectIds.has(event.projectId)
  if (isInSelection && uiStore.selectionCount > 1) {
    // 右键在已选中集合内 + 选中 >1 → 保持多选，打开菜单
    uiStore.showContextMenu(event.projectId, event.x, event.y)
  } else {
    // 否则清空选中，只选当前项
    uiStore.clearSelection()
    uiStore.toggleSelect(event.projectId, -1)
    uiStore.showContextMenu(event.projectId, event.x, event.y)
  }
}

// ===== 多选事件 =====
function onToggleSelect(event: { id: string; index: number }): void {
  uiStore.toggleSelect(event.id, event.index)
}

function onShiftSelect(event: { id: string; index: number }): void {
  if (uiStore.lastClickedIndex !== null) {
    uiStore.rangeSelect(uiStore.lastClickedIndex, event.index, visibleIds.value)
  } else {
    // 没有锚点则当作普通选中
    uiStore.toggleSelect(event.id, event.index)
  }
}

// ===== 键盘事件 =====
function onKeydown(e: KeyboardEvent): void {
  // 在输入框中不处理
  if ((e.target as HTMLElement)?.tagName === 'INPUT') return

  if (e.key === 'Escape') {
    uiStore.clearSelection()
    uiStore.hideContextMenu()
  } else if (e.key === 'Delete' && uiStore.selectionCount > 0) {
    const ids = [...uiStore.selectedProjectIds]
    projectStore.removeProjects(ids)
    uiStore.clearSelection()
    uiStore.hideContextMenu()
  } else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
    e.preventDefault()
    uiStore.selectAll(visibleIds.value)
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
})

// ===== 拖放处理 =====
function onDragEnter(e: DragEvent): void {
  e.preventDefault()
  dragCounter.value++
  isDragOver.value = true
}

function onDragOver(e: DragEvent): void {
  e.preventDefault()
}

function onDragLeave(): void {
  dragCounter.value--
  if (dragCounter.value <= 0) {
    dragCounter.value = 0
    isDragOver.value = false
  }
}

async function onDrop(e: DragEvent): Promise<void> {
  e.preventDefault()
  isDragOver.value = false
  dragCounter.value = 0

  const files = e.dataTransfer?.files
  if (!files || files.length === 0) return

  for (const file of files) {
    const filePath: string | undefined = (file as any).path
    if (filePath) {
      await projectStore.addByPath(filePath, uiStore.activeGroupId ?? undefined)
    }
  }
}
</script>

<template>
  <div
    ref="gridRef"
    class="flex-1 overflow-y-auto p-4 relative"
    :class="{ 'bg-blue-50/30': isDragOver }"
    @dragenter="onDragEnter"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @click="uiStore.hideContextMenu()"
  >
    <!-- 分组标题 -->
    <div class="mb-2 flex items-center gap-2">
      <h3 class="text-xs font-medium text-[var(--text-secondary)]">{{ currentGroupName }}</h3>
      <span class="text-10px text-[var(--text-muted)]">{{ filteredProjects.length }} 项</span>
    </div>

    <!-- 空状态 -->
    <div
      v-if="filteredProjects.length === 0"
      class="flex flex-col items-center justify-center h-64 text-[var(--text-muted)]"
    >
      <span class="i-mdi-folder-open-outline text-4xl mb-3" />
      <p class="text-sm mb-1">
        {{ projectStore.projects.length === 0 ? '还没有项目' : '没有匹配的项目' }}
      </p>
      <p class="text-xs">
        {{
          projectStore.projects.length === 0
            ? '拖放文件到此区域，或点击下方按钮添加'
            : '尝试更换分组、标签筛选或搜索词'
        }}
      </p>
      <button
        v-if="projectStore.projects.length === 0"
        class="btn-primary mt-3"
        @click="uiStore.openAddProjectDialog()"
      >
        <span class="i-mdi-plus text-sm mr-1" />
        添加项目
      </button>
    </div>

    <!-- 项目网格 -->
    <div
      v-else
      class="grid gap-2"
      style="grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));"
    >
      <ProjectCard
        v-for="(project, index) in filteredProjects"
        :key="project.id"
        :project="project"
        :selected="uiStore.isSelected(project.id)"
        :index="index"
        @launch="onLaunch"
        @contextmenu="onContextMenu"
        @toggle-select="onToggleSelect"
        @shift-select="onShiftSelect"
      />
    </div>

    <!-- 底部添加按钮 -->
    <div
      v-if="projectStore.projects.length > 0"
      class="mt-3 flex justify-center"
    >
      <button
        class="btn-ghost flex items-center gap-1"
        @click="uiStore.openAddProjectDialog()"
      >
        <span class="i-mdi-plus text-sm" />
        <span>添加项目</span>
      </button>
    </div>

    <!-- 拖放提示浮层 -->
    <div
      v-if="isDragOver"
      class="absolute inset-0 flex items-center justify-center bg-blue-500/10 border-2 border-dashed border-blue-400 rounded-lg z-10"
    >
      <div class="text-center">
        <span class="i-mdi-cloud-upload-outline text-3xl text-blue-500 mb-2" />
        <p class="text-sm text-blue-600 font-medium">释放以添加项目</p>
      </div>
    </div>
  </div>
</template>
