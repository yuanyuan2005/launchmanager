<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import type { Project } from '../../main/types'
import { getTypeIcon } from '../utils/ipc-client'
import { useProjectStore } from '../stores/project-store'
import { useUiStore } from '../stores/ui-store'
import { useIconLoader } from '../composables/useIconLoader'

const props = defineProps<{
  project: Project
  selected?: boolean
  index?: number
}>()

const emit = defineEmits<{
  launch: [projectId: string]
  contextmenu: [event: { projectId: string; x: number; y: number }]
  'toggle-select': [event: { id: string; index: number }]
  'shift-select': [event: { id: string; index: number }]
}>()

const store = useProjectStore()
const uiStore = useUiStore()
const { observe } = useIconLoader()

// 文件夹回退图标
const FOLDER_FALLBACK_SVG = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#F6C23E">
  <path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
</svg>
`)}`

const isFolder = computed(() => props.project.type === 'folder')
const cardRef = ref<HTMLElement | null>(null)

// ===== P0: 占位符优先 —— 真实图标异步加载完成后淡入覆盖 =====
const iconSrc = ref<string | null>(null)
const iconReady = ref(false)

async function loadIcon(): Promise<void> {
  if (!props.project.isValid) return

  // ① store 中已有缓存
  if (store.iconDataMap[props.project.id]) {
    setIcon(store.iconDataMap[props.project.id])
    return
  }

  // ② 旧格式：内联 data URL
  if (props.project.icon && props.project.icon.startsWith('data:')) {
    setIcon(props.project.icon)
    return
  }

  // ②.5 磁盘缓存
  if (props.project.icon) {
    try {
      const dataUrl = await window.api.getIconData(props.project.icon)
      if (dataUrl) {
        store.iconDataMap[props.project.id] = dataUrl
        setIcon(dataUrl)
        return
      }
    } catch { /* 未命中，继续 */ }
  }

  // ③ 实时获取
  try {
    const dataUrl = await window.api.getFileIcon(props.project.sourcePath)
    if (dataUrl) {
      store.iconDataMap[props.project.id] = dataUrl
      setIcon(dataUrl)
    }
  } catch { /* 失败，保持占位符 */ }
}

function setIcon(dataUrl: string): void {
  iconSrc.value = dataUrl
  requestAnimationFrame(() => {
    iconReady.value = true
  })
}

function onImgError(): void {
  iconSrc.value = null
  iconReady.value = false
}

// ===== 交互（多选 + 启动） =====
function onClick(e: MouseEvent): void {
  if (!props.project.isValid) return

  if (e.ctrlKey || e.metaKey) {
    // Ctrl+Click：切换选中
    emit('toggle-select', { id: props.project.id, index: props.index ?? -1 })
  } else if (e.shiftKey && uiStore.lastClickedIndex !== null) {
    // Shift+Click：范围选择
    emit('shift-select', { id: props.project.id, index: props.index ?? -1 })
  } else {
    // 无修饰键：清空选中 + 启动
    uiStore.clearSelection()
    emit('launch', props.project.id)
  }
}

function onContextMenu(e: MouseEvent): void {
  e.preventDefault()
  // 不在这里处理选中逻辑——由 ProjectGrid 统一处理
  emit('contextmenu', {
    projectId: props.project.id,
    x: e.clientX,
    y: e.clientY,
  })
}

function onDragStart(e: DragEvent): void {
  // 多选拖拽：序列化全部选中 ID
  if (props.selected && uiStore.selectionCount > 1) {
    e.dataTransfer?.setData('text/project-ids', JSON.stringify([...uiStore.selectedProjectIds]))
  } else {
    e.dataTransfer?.setData('text/project-id', props.project.id)
  }
  e.dataTransfer!.effectAllowed = 'move'
}

// ===== P1: 视口懒加载 =====
onMounted(() => {
  if (cardRef.value) {
    observe(cardRef.value, () => loadIcon())
  }
})
</script>

<template>
  <div
    ref="cardRef"
    class="card relative group"
    :class="{
      'card-invalid': !project.isValid,
      'card-selected': selected
    }"
    draggable="true"
    @click="onClick"
    @contextmenu="onContextMenu"
    @dragstart="onDragStart"
    :title="project.isValid ? project.name : `${project.name} (路径无效)`"
  >
    <!-- 选中标记：左上角蓝色圆形勾 -->
    <div
      v-if="selected"
      class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center z-10 shadow-sm"
    >
      <span class="i-mdi-check-bold text-white text-11px" />
    </div>

    <!-- 图标区 -->
    <div class="card-icon relative">
      <!-- P0: 占位符 —— 始终渲染，瞬间可见 -->
      <img
        v-if="isFolder"
        :src="FOLDER_FALLBACK_SVG"
        class="w-8 h-8 object-contain"
        alt=""
      />
      <span
        v-else
        :class="[getTypeIcon(project.type), project.type === 'folder' ? 'text-amber-500' : 'text-blue-500']"
      />

      <!-- P0: 真实图标 —— 异步加载完成后淡入 -->
      <img
        v-if="iconSrc"
        :src="iconSrc"
        class="absolute inset-0 w-8 h-8 object-contain m-auto transition-opacity duration-300"
        :class="iconReady ? 'opacity-100' : 'opacity-0'"
        alt=""
        @error="onImgError"
      />
    </div>

    <!-- 名称 -->
    <div class="card-name">
      {{ project.name }}
    </div>

    <!-- 类型标记 -->
    <div class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <span class="text-10px px-1 py-0.5 rounded bg-gray-100 text-gray-400">
        {{ project.type === 'shortcut' ? '快捷方式' : project.type === 'folder' ? '文件夹' : '文件' }}
      </span>
    </div>

    <!-- 失效标记 -->
    <div v-if="!project.isValid" class="absolute inset-0 flex items-center justify-center">
      <span class="text-10px px-1 py-0.5 rounded bg-red-50 text-red-400">
        路径无效
      </span>
    </div>
  </div>
</template>
