<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useProjectStore } from '../stores/project-store'
import { useGroupStore } from '../stores/group-store'
import { useTagStore } from '../stores/tag-store'
import { useUiStore } from '../stores/ui-store'

const projectStore = useProjectStore()
const groupStore = useGroupStore()
const tagStore = useTagStore()
const uiStore = useUiStore()

const project = computed(() => {
  if (!uiStore.contextMenu.projectId) return null
  return projectStore.getProject(uiStore.contextMenu.projectId)
})

function close(): void {
  uiStore.hideContextMenu()
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') close()
}

onMounted(() => document.addEventListener('keydown', handleKeydown))
onUnmounted(() => document.removeEventListener('keydown', handleKeydown))

async function onToggleTag(tagId: string): Promise<void> {
  if (!project.value) return
  const currentTags = [...project.value.tagIds]
  const idx = currentTags.indexOf(tagId)
  if (idx >= 0) {
    currentTags.splice(idx, 1)
  } else {
    currentTags.push(tagId)
  }
  await projectStore.updateTags(project.value.id, currentTags)
}

async function onMoveToGroup(groupId: string): Promise<void> {
  if (!project.value) return
  await projectStore.moveToGroup(project.value.id, groupId)
  close()
}

async function onRemoveFromList(): Promise<void> {
  if (!project.value) return
  await projectStore.removeProject(project.value.id)
  close()
}

async function onOpenFolder(): Promise<void> {
  if (!project.value) return
  await projectStore.openFileLocation(project.value.id)
  close()
}

const menuStyle = computed(() => {
  const { x, y } = uiStore.contextMenu
  const maxX = window.innerWidth - 200
  const maxY = window.innerHeight - 320
  return {
    left: `${Math.min(x, maxX)}px`,
    top: `${Math.min(y, maxY)}px`
  }
})
</script>

<template>
  <Teleport to="body">
    <!-- 遮罩层 -->
    <div
      v-if="uiStore.contextMenu.visible"
      class="fixed inset-0 z-40"
      @click="close"
    />

    <!-- 菜单 -->
    <div
      v-if="uiStore.contextMenu.visible && project"
      class="fixed z-50 bg-white rounded-lg shadow-lg border border-[var(--border-light)] py-1 min-w-44"
      :style="menuStyle"
    >
      <!-- 项目名称 -->
      <div class="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] border-b border-[var(--border-light)] truncate max-w-48">
        {{ project.name }}
      </div>

      <!-- 标签编辑区域 -->
      <div class="px-2 py-1.5 border-b border-[var(--border-light)]">
        <div class="text-10px text-[var(--text-muted)] mb-1 px-1">编辑标签</div>
        <div class="flex flex-wrap gap-1 max-w-48">
          <button
            v-for="tag in tagStore.tags"
            :key="tag.id"
            class="text-xs px-2 py-0.5 rounded-full cursor-pointer transition-colors"
            :class="project.tagIds.includes(tag.id)
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'"
            @click="onToggleTag(tag.id)"
          >
            {{ tag.name }}
          </button>
          <span
            v-if="tagStore.tags.length === 0"
            class="text-xs text-[var(--text-muted)] px-1"
          >
            暂无标签，在设置中管理
          </span>
        </div>
      </div>

      <!-- 移动到分组 -->
      <div class="relative group/sub">
        <button
          class="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors text-left"
        >
          <span class="i-mdi-folder-move-outline text-base text-[var(--text-muted)]" />
          <span>移动到分组</span>
          <span class="i-mdi-chevron-right text-sm ml-auto text-[var(--text-muted)]" />
        </button>

        <!-- 子菜单 -->
        <div class="absolute left-full top-0 hidden group-hover/sub:block bg-white rounded-lg shadow-lg border border-[var(--border-light)] py-1 min-w-30 ml-1">
          <button
            v-for="group in groupStore.groups"
            :key="group.id"
            class="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-[var(--bg-hover)] transition-colors text-left"
            :class="project.groupId === group.id ? 'text-blue-500 bg-blue-50' : 'text-[var(--text-primary)]'"
            @click="onMoveToGroup(group.id)"
          >
            <span class="i-mdi-folder-outline text-base flex-shrink-0" />
            <span class="truncate">{{ group.name }}</span>
            <span v-if="project.groupId === group.id" class="i-mdi-check text-sm ml-auto text-blue-500" />
          </button>
        </div>
      </div>

      <div class="border-t border-[var(--border-light)] my-0.5" />

      <!-- 打开所在文件夹 -->
      <button
        class="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors text-left"
        @click="onOpenFolder"
      >
        <span class="i-mdi-folder-open-outline text-base text-[var(--text-muted)]" />
        <span>打开所在文件夹</span>
      </button>

      <div class="border-t border-[var(--border-light)] my-0.5" />

      <!-- 从清单移除 -->
      <button
        class="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 transition-colors text-left"
        @click="onRemoveFromList"
      >
        <span class="i-mdi-delete-outline text-base" />
        <span>从清单移除</span>
      </button>
    </div>
  </Teleport>
</template>
