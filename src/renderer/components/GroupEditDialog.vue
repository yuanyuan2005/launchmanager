<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGroupStore } from '../stores/group-store'
import { useUiStore } from '../stores/ui-store'

const groupStore = useGroupStore()
const uiStore = useUiStore()

const nameInput = ref('')
const error = ref('')

const isEditing = computed(() => !!uiStore.editingGroup)
const title = computed(() => isEditing.value ? '重命名分组' : '新建分组')
const submitLabel = computed(() => isEditing.value ? '保存' : '创建')

function open(): void {
  if (uiStore.editingGroup) {
    nameInput.value = uiStore.editingGroup.name
  } else {
    nameInput.value = ''
  }
  error.value = ''
}

// 监听 dialog 打开
import { watch } from 'vue'
watch(() => uiStore.showGroupEditDialog, (val) => {
  if (val) open()
})

async function onSubmit(): Promise<void> {
  const name = nameInput.value.trim()
  if (!name) {
    error.value = '名称不能为空'
    return
  }

  let result: any
  if (isEditing.value && uiStore.editingGroup) {
    result = await groupStore.renameGroup(uiStore.editingGroup.id, name)
  } else {
    result = await groupStore.createGroup(name)
  }

  if (result) {
    uiStore.closeGroupEditDialog()
  } else {
    error.value = '名称已存在或操作失败'
  }
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter') onSubmit()
  if (e.key === 'Escape') uiStore.closeGroupEditDialog()
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="uiStore.showGroupEditDialog"
      class="dialog-overlay"
      @click.self="uiStore.closeGroupEditDialog()"
    >
      <div class="dialog-panel">
        <h3 class="text-base font-medium text-[var(--text-primary)] mb-3">{{ title }}</h3>

        <input
          ref="nameInputRef"
          v-model="nameInput"
          type="text"
          :placeholder="isEditing ? '输入新名称' : '输入分组名称'"
          class="w-full px-3 py-2 border border-[var(--border-medium)] rounded-md text-sm outline-none focus:border-[var(--accent)] transition-colors"
          @keydown="onKeydown"
          autofocus
        />

        <div v-if="error" class="mt-2 text-xs text-red-500">{{ error }}</div>

        <div class="flex justify-end gap-2 mt-4">
          <button class="btn-ghost" @click="uiStore.closeGroupEditDialog()">取消</button>
          <button class="btn-primary" @click="onSubmit">{{ submitLabel }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
