<script setup lang="ts">
import { ref, watch } from 'vue'
import { useUiStore } from '../stores/ui-store'

const uiStore = useUiStore()

// ===== 本地状态 =====
const hotkey = ref('Alt+Space')
const windowWidth = ref(800)
const windowHeight = ref(550)
const recording = ref(false)
const saved = ref(false)

// 键盘映射显示名
const KEY_DISPLAY: Record<string, string> = {
  'Command': 'Win',
  'Control': 'Ctrl',
  'Alt': 'Alt',
  'Shift': 'Shift',
  'Space': 'Space',
}

async function loadSettings(): Promise<void> {
  const settings = await window.api.getSettings()
  if (settings) {
    hotkey.value = settings.hotkey || 'Alt+Space'
    windowWidth.value = settings.windowWidth || 800
    windowHeight.value = settings.windowHeight || 550
  }
}

watch(() => uiStore.showSettingsDialog, (val) => {
  if (val) {
    saved.value = false
    loadSettings()
  }
})

// ===== 热键录制 =====
function startRecording(): void {
  recording.value = true
  hotkey.value = ''
}

function onKeyDown(e: KeyboardEvent): void {
  if (!recording.value) return
  e.preventDefault()
  e.stopPropagation()

  const parts: string[] = []
  if (e.metaKey || e.ctrlKey) parts.push(e.metaKey ? 'Command' : 'Control')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')

  // 排除纯修饰键
  const modifierOnly = ['Meta', 'Control', 'Alt', 'Shift']
  if (!modifierOnly.includes(e.key)) {
    const keyName = e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key
    parts.push(keyName)
    hotkey.value = parts.join('+')
    recording.value = false
  }
}

// 挂载键盘监听
import { onMounted, onUnmounted } from 'vue'
onMounted(() => document.addEventListener('keydown', onKeyDown))
onUnmounted(() => document.removeEventListener('keydown', onKeyDown))

// ===== 保存 =====
async function save(): Promise<void> {
  await window.api.updateSettings({
    hotkey: hotkey.value,
    windowWidth: windowWidth.value,
    windowHeight: windowHeight.value,
  })
  saved.value = true
  setTimeout(() => {
    uiStore.showSettingsDialog = false
  }, 600)
}

// ===== 格式化显示热键 =====
function formatHotkey(key: string): string {
  return key.split('+').map(k => KEY_DISPLAY[k] || k).join(' + ')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="uiStore.showSettingsDialog"
      class="dialog-overlay"
      @click.self="uiStore.showSettingsDialog = false"
    >
      <div class="dialog-panel w-96">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-base font-medium text-[var(--text-primary)]">设置</h3>
          <button
            class="p-1 rounded text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors"
            @click="uiStore.showSettingsDialog = false"
          >
            <span class="i-mdi-close text-lg" />
          </button>
        </div>

        <!-- 热键设置 -->
        <div class="mb-4">
          <label class="text-sm font-medium text-[var(--text-primary)] block mb-1.5">全局热键</label>
          <button
            class="w-full px-3 py-2 border rounded-md text-sm text-left transition-colors"
            :class="recording
              ? 'border-blue-400 bg-blue-50 text-blue-600'
              : 'border-[var(--border-medium)] text-[var(--text-primary)] hover:border-gray-300'"
            @click="startRecording"
          >
            <span v-if="recording" class="flex items-center gap-2">
              <span class="i-mdi-keyboard text-base animate-pulse" />
              <span>请按下快捷键...</span>
            </span>
            <span v-else class="flex items-center gap-2">
              <span class="i-mdi-keyboard-outline text-base text-[var(--text-muted)]" />
              <span>{{ formatHotkey(hotkey) }}</span>
            </span>
          </button>
          <p class="text-xs text-[var(--text-muted)] mt-1">点击后按下组合键，建议使用 Alt+字母</p>
        </div>

        <!-- 窗口尺寸 -->
        <div class="mb-5">
          <label class="text-sm font-medium text-[var(--text-primary)] block mb-1.5">窗口尺寸</label>
          <div class="flex items-center gap-2">
            <input
              v-model.number="windowWidth"
              type="number"
              min="400"
              max="1920"
              class="w-24 px-3 py-2 border border-[var(--border-medium)] rounded-md text-sm outline-none focus:border-[var(--accent)] transition-colors"
            />
            <span class="text-[var(--text-muted)] text-sm">×</span>
            <input
              v-model.number="windowHeight"
              type="number"
              min="300"
              max="1080"
              class="w-24 px-3 py-2 border border-[var(--border-medium)] rounded-md text-sm outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="flex justify-end gap-2">
          <button class="btn-ghost" @click="uiStore.showSettingsDialog = false">取消</button>
          <button class="btn-primary min-w-20" :class="{ 'bg-green-500': saved }" @click="save">
            <span v-if="saved" class="flex items-center gap-1">
              <span class="i-mdi-check text-sm" />
              已保存
            </span>
            <span v-else>保存</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
