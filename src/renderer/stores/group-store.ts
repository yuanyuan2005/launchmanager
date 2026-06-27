import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Group } from '../../main/types'

export const useGroupStore = defineStore('group', () => {
  const groups = ref<Group[]>([])

  async function loadGroups(): Promise<void> {
    const data = await window.api.getAllGroups()
    if (data) groups.value = data
  }

  async function createGroup(name: string): Promise<Group | null> {
    const result = await window.api.createGroup(name)
    if (result) {
      groups.value.push(result)
    }
    return result
  }

  async function renameGroup(groupId: string, name: string): Promise<boolean> {
    const result = await window.api.renameGroup(groupId, name)
    if (result) {
      const group = groups.value.find(g => g.id === groupId)
      if (group) group.name = name
    }
    return result
  }

  async function deleteGroup(groupId: string): Promise<boolean> {
    const result = await window.api.deleteGroup(groupId)
    if (result) {
      groups.value = groups.value.filter(g => g.id !== groupId)
    }
    return result
  }

  async function moveGroupUp(groupId: string): Promise<boolean> {
    const result = await window.api.moveGroupUp(groupId)
    if (result && Array.isArray(result)) {
      groups.value = result
      return true
    }
    return false
  }

  async function moveGroupDown(groupId: string): Promise<boolean> {
    const result = await window.api.moveGroupDown(groupId)
    if (result && Array.isArray(result)) {
      groups.value = result
      return true
    }
    return false
  }

  function getGroup(id: string): Group | undefined {
    return groups.value.find(g => g.id === id)
  }

  const sortedGroups = computed(() =>
    [...groups.value].sort((a, b) => a.order - b.order)
  )

  return { groups, sortedGroups, loadGroups, createGroup, renameGroup, deleteGroup, moveGroupUp, moveGroupDown, getGroup }
})
