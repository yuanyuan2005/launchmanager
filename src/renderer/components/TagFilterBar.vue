<script setup lang="ts">
import { useTagStore } from '../stores/tag-store'
import { useUiStore } from '../stores/ui-store'

const tagStore = useTagStore()
const uiStore = useUiStore()

function toggleTag(tagId: string): void {
  uiStore.toggleTag(tagId)
}

function toggleMode(): void {
  uiStore.toggleFilterMode()
}
</script>

<template>
  <div class="flex items-center gap-1.5 px-3 py-2 border-b border-[var(--border-light)] bg-[var(--bg-surface)] min-h-9">
    <!-- 标签图标 -->
    <span class="i-mdi-tag-outline text-sm text-[var(--text-muted)] flex-shrink-0 mr-0.5" />

    <!-- 筛选模式切换 -->
    <button
      class="text-xs px-1.5 py-0.5 rounded cursor-pointer transition-colors flex-shrink-0"
      :class="uiStore.filterMode === 'intersection'
        ? 'bg-green-100 text-green-600 hover:bg-green-200'
        : 'bg-blue-100 text-blue-600 hover:bg-blue-200'"
      title="切换交/并集模式"
      @click="toggleMode"
    >
      {{ uiStore.filterMode === 'intersection' ? '交集' : '并集' }}
    </button>

    <!-- 分隔 -->
    <span class="w-px h-4 bg-[var(--border-light)] flex-shrink-0 mx-0.5" />

    <!-- 标签列表 -->
    <div class="flex items-center gap-1.5 overflow-x-auto flex-1">
      <button
        v-for="tag in tagStore.tags"
        :key="tag.id"
        class="tag-chip flex-shrink-0"
        :class="uiStore.selectedTagIds.has(tag.id) ? 'tag-chip-active' : 'tag-chip-inactive'"
        @click="toggleTag(tag.id)"
      >
        {{ tag.name }}
      </button>

      <!-- 无标签提示 -->
      <span
        v-if="tagStore.tags.length === 0"
        class="text-xs text-[var(--text-muted)]"
      >
        暂无标签，在右键菜单中管理
      </span>
    </div>

    <!-- 管理标签 -->
    <button
      class="flex-shrink-0 p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
      title="管理标签"
      @click="uiStore.openTagEditDialog()"
    >
      <span class="i-mdi-dots-horizontal text-sm" />
    </button>
  </div>
</template>
