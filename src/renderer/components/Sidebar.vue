<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useGroupStore } from '../stores/group-store'
import { useUiStore } from '../stores/ui-store'
import { useProjectStore } from '../stores/project-store'

const groupStore = useGroupStore()
const uiStore = useUiStore()
const projectStore = useProjectStore()

// ===== 分组右键菜单 =====
const ctxGroup = ref<{ id: string; name: string; isDefault: boolean } | null>(null)
const ctxStyle = ref({ left: '0px', top: '0px' })
const ctxVisible = ref(false)

function showGroupCtx(e: MouseEvent, group: { id: string; name: string; isDefault: boolean }): void {
  e.preventDefault()
  e.stopPropagation()
  ctxGroup.value = group
  ctxStyle.value = {
    left: `${Math.min(e.clientX, window.innerWidth - 150)}px`,
    top: `${Math.min(e.clientY, window.innerHeight - 120)}px`
  }
  ctxVisible.value = true
}

function hideGroupCtx(): void {
  ctxVisible.value = false
  ctxGroup.value = null
}

// 点击其他区域关闭菜单
function onDocClick(): void {
  if (ctxVisible.value) hideGroupCtx()
}
onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))

async function onRenameGroup(): Promise<void> {
  if (!ctxGroup.value) return
  const g = ctxGroup.value
  hideGroupCtx()
  uiStore.openGroupEditDialog({ id: g.id, name: g.name })
}

async function onDeleteGroup(): Promise<void> {
  if (!ctxGroup.value || ctxGroup.value.isDefault) return
  const g = ctxGroup.value
  hideGroupCtx()
  if (confirm(`确定删除分组"${g.name}"吗？\n该分组下的项目将移至"未分组"。`)) {
    await groupStore.deleteGroup(g.id)
  }
}

async function onMoveUp(): Promise<void> {
  if (!ctxGroup.value) return
  hideGroupCtx()
  await groupStore.moveGroupUp(ctxGroup.value.id)
}

async function onMoveDown(): Promise<void> {
  if (!ctxGroup.value) return
  hideGroupCtx()
  await groupStore.moveGroupDown(ctxGroup.value.id)
}

// ===== 拖放支持（兼容多选 + 单选） =====
function onDragOverGroup(e: DragEvent): void {
  e.preventDefault()
  e.stopPropagation()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
}

function onDropOnGroup(e: DragEvent, groupId: string): void {
  e.preventDefault()
  e.stopPropagation()

  // 尝试多选格式
  const multiData = e.dataTransfer?.getData('text/project-ids')
  if (multiData) {
    try {
      const ids: string[] = JSON.parse(multiData)
      projectStore.moveProjectsToGroup(ids, groupId)
    } catch { /* ignore parse error */ }
    return
  }

  // 回退单选格式
  const projectId = e.dataTransfer?.getData('text/project-id')
  if (projectId) {
    projectStore.moveToGroup(projectId, groupId)
  }
}

function getProjectCount(groupId: string): number {
  return projectStore.projects.filter(p => p.groupId === groupId).length
}

function selectGroup(groupId: string | null): void {
  hideGroupCtx()
  uiStore.activeGroupId = groupId
}

const allCount = computed(() => projectStore.projects.length)
</script>

<template>
  <div class="w-38 flex-shrink-0 flex flex-col bg-[var(--bg-surface)] border-r border-[var(--border-light)]">
    <div class="flex-1 overflow-y-auto py-1 px-1.5">
      <!-- "全部"入口 -->
      <div
        class="sidebar-item flex justify-between items-center mb-0.5"
        :class="uiStore.activeGroupId === null ? 'sidebar-item-active' : 'sidebar-item-normal'"
        @click="selectGroup(null)"
        @dragover.prevent="onDragOverGroup"
        @drop="(e: DragEvent) => onDropOnGroup(e, 'grp_default')"
      >
        <span class="flex items-center gap-2">
          <span class="i-mdi-view-grid-outline text-base" />
          <span>全部</span>
        </span>
        <span class="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 min-w-5 text-center">
          {{ allCount }}
        </span>
      </div>

      <div class="my-2 border-t border-[var(--border-light)]" />

      <!-- 分组列表（按 order 排序） -->
      <div
        v-for="group in groupStore.sortedGroups"
        :key="group.id"
        class="sidebar-item flex justify-between items-center mb-0.5"
        :class="uiStore.activeGroupId === group.id ? 'sidebar-item-active' : 'sidebar-item-normal'"
        @click="selectGroup(group.id)"
        @contextmenu="showGroupCtx($event, group)"
        @dragover.prevent="onDragOverGroup"
        @drop="(e: DragEvent) => onDropOnGroup(e, group.id)"
      >
        <span class="flex items-center gap-2 truncate">
          <span class="i-mdi-folder-outline text-base flex-shrink-0" />
          <span class="truncate">{{ group.name }}</span>
        </span>
        <span class="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 min-w-5 text-center flex-shrink-0 ml-1">
          {{ getProjectCount(group.id) }}
        </span>
      </div>
    </div>

    <div class="p-1.5 border-t border-[var(--border-light)]">
      <button
        class="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-light)] rounded-md transition-colors"
        @click="uiStore.openGroupEditDialog()"
      >
        <span class="i-mdi-plus text-sm" />
        <span>新建分组</span>
      </button>
    </div>

    <!-- 右键菜单（fixed 定位到 body 层级） -->
    <div
      v-if="ctxVisible && ctxGroup"
      class="fixed z-60 bg-white rounded-lg shadow-lg border border-[var(--border-light)] py-1 min-w-34"
      :style="ctxStyle"
      @click.stop
    >
      <div class="px-3 py-1 text-xs font-medium text-[var(--text-secondary)] border-b border-[var(--border-light)] truncate max-w-40">
        {{ ctxGroup.name }}
      </div>
      <button
        class="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors text-left"
        @click="onRenameGroup"
      >
        <span class="i-mdi-pencil text-base text-[var(--text-muted)]" />
        <span>重命名</span>
      </button>
      <button
        class="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors text-left"
        :class="{ 'opacity-30 pointer-events-none': !ctxGroup || ctxGroup.isDefault }"
        @click="onMoveUp"
      >
        <span class="i-mdi-arrow-up text-base text-[var(--text-muted)]" />
        <span>上移</span>
      </button>
      <button
        class="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors text-left"
        :class="{ 'opacity-30 pointer-events-none': !ctxGroup || ctxGroup.isDefault }"
        @click="onMoveDown"
      >
        <span class="i-mdi-arrow-down text-base text-[var(--text-muted)]" />
        <span>下移</span>
      </button>
      <div class="border-t border-[var(--border-light)] my-0.5" />
      <button
        v-if="ctxGroup && !ctxGroup.isDefault"
        class="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 transition-colors text-left"
        @click="onDeleteGroup"
      >
        <span class="i-mdi-delete-outline text-base" />
        <span>删除</span>
      </button>
    </div>
  </div>
</template>
