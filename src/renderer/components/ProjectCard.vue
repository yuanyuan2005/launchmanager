<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import type { Project } from '../../main/types'
import { getTypeIcon } from '../utils/ipc-client'
import { useProjectStore } from '../stores/project-store'
import { useIconLoader } from '../composables/useIconLoader'

const props = defineProps<{
  project: Project
}>()

const emit = defineEmits<{
  launch: [projectId: string]
  contextmenu: [event: { projectId: string; x: number; y: number }]
}>()

const store = useProjectStore()
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

  // ① store 中已有缓存（其他卡片加载时写入的）
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
    } catch {
      // 磁盘缓存未命中，继续
    }
  }

  // ③ 实时获取（最慢，仅磁盘缓存未命中时走这里）
  try {
    const dataUrl = await window.api.getFileIcon(props.project.sourcePath)
    if (dataUrl) {
      store.iconDataMap[props.project.id] = dataUrl
      setIcon(dataUrl)
    }
  } catch {
    // 获取失败，保持占位符
  }
}

/** 设置图标 src 并触发淡入 */
function setIcon(dataUrl: string): void {
  iconSrc.value = dataUrl
  // requestAnimationFrame 确保 v-if 创建的 img 元素已挂载到 DOM，
  // 下一帧再设 opacity-100，CSS transition 产生淡入效果
  requestAnimationFrame(() => {
    iconReady.value = true
  })
}

function onImgError(): void {
  iconSrc.value = null
  iconReady.value = false
}

// ===== 交互 =====
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
    y: e.clientY,
  })
}

function onDragStart(e: DragEvent): void {
  e.dataTransfer?.setData('text/project-id', props.project.id)
  e.dataTransfer!.effectAllowed = 'move'
}

// ===== P1: 卡片进入视口时才加载图标 =====
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
    :class="{ 'card-invalid': !project.isValid }"
    draggable="true"
    @click="onClick"
    @contextmenu="onContextMenu"
    @dragstart="onDragStart"
    :title="project.isValid ? project.name : `${project.name} (路径无效)`"
  >
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

      <!-- P0: 真实图标 —— 异步加载完成后淡入，覆盖占位符 -->
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
