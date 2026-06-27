<script setup lang="ts">
import { onMounted } from 'vue'
import { useProjectStore } from './stores/project-store'
import { useGroupStore } from './stores/group-store'
import { useTagStore } from './stores/tag-store'
import { useUiStore } from './stores/ui-store'
import SearchBar from './components/SearchBar.vue'
import Sidebar from './components/Sidebar.vue'
import TagFilterBar from './components/TagFilterBar.vue'
import ProjectGrid from './components/ProjectGrid.vue'
import ContextMenu from './components/ContextMenu.vue'
import AddProjectDialog from './components/AddProjectDialog.vue'
import GroupEditDialog from './components/GroupEditDialog.vue'
import TagEditDialog from './components/TagEditDialog.vue'
import SettingsDialog from './components/SettingsDialog.vue'

const projectStore = useProjectStore()
const groupStore = useGroupStore()
const tagStore = useTagStore()
const uiStore = useUiStore()

onMounted(async () => {
  // 并行：数据加载 + 遮罩最短展示时长（800ms），避免一闪而过像抽搐
  const minSplashMs = 800
  const dataPromise = Promise.all([
    projectStore.loadProjects(),
    groupStore.loadGroups(),
    tagStore.loadTags(),
  ])
  const minDelay = new Promise(resolve => setTimeout(resolve, minSplashMs))

  await Promise.all([dataPromise, minDelay])

  // 首次运行：自动扫描桌面
  if (projectStore.projects.length === 0) {
    const newProjects = await window.api.scanDesktop()
    if (newProjects && newProjects.length > 0) {
      await projectStore.loadProjects()
    }
  }

  // 检查路径有效性
  await projectStore.checkValidity()

  // 淡出启动遮罩，露出真实内容
  const splash = document.getElementById('app-splash')
  if (splash) {
    splash.classList.add('is-hidden')
    // 动画结束后移除 DOM，释放内存
    splash.addEventListener('transitionend', () => splash.remove(), { once: true })
  }

  // 通知主进程渲染器就绪
  window.api.notifyReady()
})
</script>

<template>
  <div class="flex flex-col h-full bg-[var(--bg-primary)]">
    <!-- 搜索栏（可拖动窗口） -->
    <SearchBar />

    <div class="flex flex-1 overflow-hidden">
      <!-- 左侧分组栏 -->
      <Sidebar />

      <!-- 右侧内容区 -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- 标签筛选栏 -->
        <TagFilterBar />

        <!-- 项目网格 -->
        <ProjectGrid />
      </div>
    </div>

    <!-- 右键菜单 -->
    <ContextMenu />

    <!-- 对话框 -->
    <AddProjectDialog />
    <GroupEditDialog />
    <TagEditDialog />
    <SettingsDialog />
  </div>
</template>
