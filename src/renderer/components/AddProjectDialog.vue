<script setup lang="ts">
import { ref } from 'vue'
import { useProjectStore } from '../stores/project-store'
import { useUiStore } from '../stores/ui-store'

const projectStore = useProjectStore()
const uiStore = useUiStore()

const adding = ref(false)
const error = ref('')

function close(): void {
  if (!adding.value) {
    uiStore.closeAddProjectDialog()
    error.value = ''
  }
}

async function onBrowseFile(): Promise<void> {
  error.value = ''
  adding.value = true

  try {
    const result = await window.api.openFileDialog()
    if (result) {
      const success = await projectStore.addByPath(result.sourcePath, uiStore.activeGroupId ?? undefined)
      if (success) {
        close()
      } else {
        error.value = '无法添加此文件'
      }
    }
  } catch (err) {
    error.value = '打开文件对话框失败'
  } finally {
    adding.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="uiStore.showAddProjectDialog"
      class="dialog-overlay"
      @click.self="close"
    >
      <div class="dialog-panel">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-base font-medium text-[var(--text-primary)]">添加项目</h3>
          <button
            class="p-1 rounded text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors"
            @click="close"
          >
            <span class="i-mdi-close text-lg" />
          </button>
        </div>

        <!-- 提示文字 -->
        <div class="mb-4 p-3 bg-[var(--bg-primary)] rounded-lg border border-dashed border-[var(--border-medium)]">
          <p class="text-sm text-[var(--text-secondary)] text-center mb-2">
            直接将文件、文件夹或快捷方式
            <strong>拖放到项目网格区域</strong>即可添加
          </p>
          <div class="flex items-center gap-2">
            <div class="flex-1 border-t border-[var(--border-light)]"></div>
            <span class="text-xs text-[var(--text-muted)]">或</span>
            <div class="flex-1 border-t border-[var(--border-light)]"></div>
          </div>
        </div>

        <!-- 浏览文件按钮 -->
        <button
          class="w-full btn-primary flex items-center justify-center gap-2 py-2"
          :disabled="adding"
          @click="onBrowseFile"
        >
          <span class="i-mdi-folder-open-outline text-base" />
          <span>{{ adding ? '添加中...' : '浏览文件添加' }}</span>
        </button>

        <!-- 错误提示 -->
        <div v-if="error" class="mt-3 p-2 rounded bg-red-50 text-red-500 text-xs">
          {{ error }}
        </div>
      </div>
    </div>
  </Teleport>
</template>
