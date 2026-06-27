<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import type { Project } from '../../main/types'
import { getTypeIcon } from '../utils/ipc-client'
import { useProjectStore } from '../stores/project-store'

const props = defineProps<{
  project: Project
}>()

const emit = defineEmits<{
  launch: [projectId: string]
  contextmenu: [event: { projectId: string; x: number; y: number }]
}>()

const store = useProjectStore()

// 文件夹 SVG 回退图标
const FOLDER_FALLBACK_SVG = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#F6C23E">
  <path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
</svg>
`)}`

const isFolder = computed(() => props.project.type === 'folder')

// ===== 图标 URL 解析 =====
// 优先从 store 的预加载 map 读取（免 IPC），其次 data: URL，最后实时获取
const iconSrc = ref<string | null>(null)
const iconLoadFailed = ref(false)

// store 预加载完成时自动更新
watch(
  () => store.iconDataMap[props.project.id],
  (dataUrl) => {
    if (dataUrl) iconSrc.value = dataUrl
  }
)

async function loadIcon(): Promise<void> {
  if (!props.project.isValid) return

  // ① store 已预加载的磁盘缓存图标
  if (store.iconDataMap[props.project.id]) {
    iconSrc.value = store.iconDataMap[props.project.id]
    return
  }

  // ② 旧格式：内联 data: URL
  if (props.project.icon && props.project.icon.startsWith('data:')) {
    iconSrc.value = props.project.icon
    return
  }

  // ②.5 尝试从磁盘缓存加载（即使 preload 还没完成，独立读取已持久化的图标文件）
  if (props.project.icon) {
    try {
      const dataUrl = await window.api.getIconData(props.project.icon)
      if (dataUrl) {
        iconSrc.value = dataUrl
        return
      }
    } catch (err) {
      console.error('[ProjectCard] 从磁盘缓存加载图标失败:', props.project.id, props.project.name, err)
    }
  }

  // ③ 磁盘缓存未命中，实时获取
  try {
    const dataUrl = await window.api.getFileIcon(props.project.sourcePath)
    if (dataUrl) iconSrc.value = dataUrl
  } catch (err) {
    console.error('[ProjectCard] 实时获取图标失败:', props.project.id, props.project.name, err)
  }
}

function onImgError(): void {
  iconLoadFailed.value = true
}

function onClick(): void {
  if (props.project.isValid) {
    emit('launch', props.project.id)
  }
}

function onContextMenu(e: MouseEvent): void {
  e.preventDefault()
  emit('contextmenu', {
    projectId: props.project.id,
    x: e.clientX,
    y: e.clientY
  })
}

function onDragStart(e: DragEvent): void {
  e.dataTransfer?.setData('text/project-id', props.project.id)
  e.dataTransfer!.effectAllowed = 'move'
}

onMounted(() => loadIcon())
</script>

<template>
  <div
    class="card relative group"
    :class="{ 'card-invalid': !project.isValid }"
    draggable="true"
    @click="onClick"
    @contextmenu="onContextMenu"
    @dragstart="onDragStart"
    :title="project.isValid ? project.name : `${project.name} (路径无效)`"
  >
    <!-- 图标区 -->
    <div class="card-icon">
      <!-- 优先：真实图标（文件/文件夹均可，从磁盘缓存或 data URL 加载） -->
      <img
        v-if="iconSrc && !iconLoadFailed"
        :src="iconSrc"
        class="w-8 h-8 object-contain"
        alt=""
        @error="onImgError"
      />
      <!-- 文件夹回退：固定 SVG -->
      <img
        v-else-if="isFolder"
        :src="FOLDER_FALLBACK_SVG"
        class="w-8 h-8 object-contain"
        alt=""
      />
      <!-- 文件/快捷方式回退：通用图标 -->
      <span
        v-else
        :class="[getTypeIcon(project.type), project.type === 'folder' ? 'text-amber-500' : 'text-blue-500']"
      />
    </div>

    <!-- 名称 -->
    <div class="card-name">
      {{ project.name }}
    </div>

    <!-- 类型标记 -->
    <div class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <span
        class="text-10px px-1 py-0.5 rounded bg-gray-100 text-gray-400"
      >
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
