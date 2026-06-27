<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useTagStore } from '../stores/tag-store'
import { useUiStore } from '../stores/ui-store'

const tagStore = useTagStore()
const uiStore = useUiStore()

const nameInput = ref('')
const error = ref('')

const dialogMode = computed(() => {
  if (uiStore.editingTag) return 'rename'
  return 'create'
})

const title = computed(() => {
  switch (dialogMode.value) {
    case 'rename': return '重命名标签'
    default: return '管理标签'
  }
})

function open(): void {
  if (uiStore.editingTag) {
    nameInput.value = uiStore.editingTag.name
  } else {
    nameInput.value = ''
  }
  error.value = ''
}

watch(() => uiStore.showTagEditDialog, (val) => {
  if (val) open()
})

async function onCreate(): Promise<void> {
  const name = nameInput.value.trim()
  if (!name) {
    error.value = '名称不能为空'
    return
  }

  const result = await tagStore.createTag(name)
  if (result) {
    nameInput.value = ''
    error.value = ''
  } else {
    error.value = '名称已存在'
  }
}

async function onRename(tagId: string): Promise<void> {
  const tag = tagStore.tags.find(t => t.id === tagId)
  if (!tag) return

  const newName = prompt('重命名为：', tag.name)
  if (newName && newName.trim() && newName.trim() !== tag.name) {
    const result = await tagStore.renameTag(tagId, newName.trim())
    if (!result) {
      error.value = '重命名失败'
    }
  }
}

async function onDelete(tagId: string): Promise<void> {
  const tag = tagStore.tags.find(t => t.id === tagId)
  if (!tag) return

  if (confirm(`确定要删除标签"${tag.name}"吗？\n所有项目上的此标签将被移除。`)) {
    await tagStore.deleteTag(tagId)
  }
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter' && dialogMode.value === 'create') onCreate()
  if (e.key === 'Escape') uiStore.closeTagEditDialog()
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="uiStore.showTagEditDialog"
      class="dialog-overlay"
      @click.self="uiStore.closeTagEditDialog()"
    >
      <div class="dialog-panel">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-base font-medium text-[var(--text-primary)]">{{ title }}</h3>
          <button
            class="p-1 rounded text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors"
            @click="uiStore.closeTagEditDialog()"
          >
            <span class="i-mdi-close text-lg" />
          </button>
        </div>

        <!-- 新建标签 -->
        <div class="flex gap-2 mb-4">
          <input
            v-model="nameInput"
            type="text"
            placeholder="输入标签名称"
            class="flex-1 px-3 py-2 border border-[var(--border-medium)] rounded-md text-sm outline-none focus:border-[var(--accent)] transition-colors"
            @keydown="onKeydown"
          />
          <button class="btn-primary flex-shrink-0" @click="onCreate">
            <span class="i-mdi-plus text-sm mr-0.5" />
            新建
          </button>
        </div>

        <div v-if="error" class="mb-3 text-xs text-red-500">{{ error }}</div>

        <!-- 已有标签列表 -->
        <div class="max-h-48 overflow-y-auto">
          <div
            v-if="tagStore.tags.length === 0"
            class="text-center text-sm text-[var(--text-muted)] py-4"
          >
            暂无标签
          </div>

          <div
            v-for="tag in tagStore.tags"
            :key="tag.id"
            class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors"
          >
            <div class="flex items-center gap-2">
              <span class="i-mdi-tag text-sm text-[var(--text-muted)]" />
              <span class="text-sm">{{ tag.name }}</span>
            </div>

            <div class="flex items-center gap-1">
              <button
                class="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-gray-100 transition-colors"
                title="重命名"
                @click="onRename(tag.id)"
              >
                <span class="i-mdi-pencil text-xs" />
              </button>
              <button
                class="p-1 rounded text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 transition-colors"
                title="删除"
                @click="onDelete(tag.id)"
              >
                <span class="i-mdi-delete text-xs" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
