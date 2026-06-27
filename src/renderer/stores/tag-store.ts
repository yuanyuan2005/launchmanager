import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Tag } from '../../main/types'

export const useTagStore = defineStore('tag', () => {
  const tags = ref<Tag[]>([])

  async function loadTags(): Promise<void> {
    const data = await window.api.getAllTags()
    if (data) tags.value = data
  }

  async function createTag(name: string): Promise<Tag | null> {
    const result = await window.api.createTag(name)
    if (result) {
      tags.value.push(result)
    }
    return result
  }

  async function renameTag(tagId: string, name: string): Promise<boolean> {
    const result = await window.api.renameTag(tagId, name)
    if (result) {
      const tag = tags.value.find(t => t.id === tagId)
      if (tag) tag.name = name
    }
    return result
  }

  async function deleteTag(tagId: string): Promise<boolean> {
    const result = await window.api.deleteTag(tagId)
    if (result) {
      tags.value = tags.value.filter(t => t.id !== tagId)
    }
    return result
  }

  function getTag(id: string): Tag | undefined {
    return tags.value.find(t => t.id === id)
  }

  return { tags, loadTags, createTag, renameTag, deleteTag, getTag }
})
