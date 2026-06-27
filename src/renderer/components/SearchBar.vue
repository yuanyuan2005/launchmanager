<script setup lang="ts">
import { useUiStore } from '../stores/ui-store'
import { useProjectStore } from '../stores/project-store'

const uiStore = useUiStore()
const projectStore = useProjectStore()

function onSearchInput(e: Event): void {
  uiStore.searchQuery = (e.target as HTMLInputElement).value
}

function onMinimize(): void {
  window.api.minimizeWindow()
}

function onMaximize(): void {
  window.api.maximizeWindow()
}

function onClose(): void {
  window.api.closeWindow()
}
</script>

<template>
  <div class="flex items-center gap-3 px-4 py-2 border-b border-[var(--border-light)] bg-[var(--bg-surface)]"
       style="-webkit-app-region: drag; -webkit-user-select: none;">
    <!-- 搜索图标 -->
    <span class="i-mdi-magnify text-lg text-[var(--text-muted)] flex-shrink-0"
          style="-webkit-app-region: no-drag;" />

    <!-- 搜索输入框 -->
    <input
      type="text"
      placeholder="搜索项目名称..."
      :value="uiStore.searchQuery"
      @input="onSearchInput"
      class="flex-1 bg-transparent border-none outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
      style="-webkit-app-region: no-drag;"
    />

    <!-- 项目数量 -->
    <span class="text-xs text-[var(--text-muted)] flex-shrink-0" style="-webkit-app-region: no-drag;">
      {{ projectStore.projects.length }} 项
    </span>

    <!-- 设置按钮 -->
    <button
      class="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
      style="-webkit-app-region: no-drag;"
      title="设置"
      @click="uiStore.showSettingsDialog = true"
    >
      <span class="i-mdi-cog-outline text-sm" />
    </button>

    <!-- 窗口控制按钮 -->
    <div class="flex items-center -mr-2" style="-webkit-app-region: no-drag;">
      <!-- 最小化 -->
      <button
        class="w-7 h-7 flex items-center justify-center rounded text-[var(--text-muted)] hover:bg-gray-200 transition-colors"
        title="最小化"
        @click="onMinimize"
      >
        <span class="i-mdi-minus text-sm" />
      </button>
      <!-- 最大化 -->
      <button
        class="w-7 h-7 flex items-center justify-center rounded text-[var(--text-muted)] hover:bg-gray-200 transition-colors"
        title="最大化"
        @click="onMaximize"
      >
        <span class="i-mdi-checkbox-blank-outline text-xs" />
      </button>
      <!-- 关闭（隐藏到托盘） -->
      <button
        class="w-7 h-7 flex items-center justify-center rounded text-[var(--text-muted)] hover:bg-red-500 hover:text-white transition-colors"
        title="隐藏到托盘"
        @click="onClose"
      >
        <span class="i-mdi-close text-sm" />
      </button>
    </div>
  </div>
</template>
