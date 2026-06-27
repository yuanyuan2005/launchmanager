import { DataStore } from './data-store'
import { generateId } from './desktop-scanner'
import type { Tag } from '../types'

export class TagManager {
  private store: DataStore

  constructor(store: DataStore) {
    this.store = store
  }

  getAll(): Tag[] {
    return this.store.getTags()
  }

  create(name: string): Tag | null {
    // 检查重名
    if (this.store.getTags().find(t => t.name === name)) {
      return null
    }

    const tag: Tag = {
      id: generateId('tag'),
      name
    }
    this.store.addTag(tag)
    return tag
  }

  rename(tagId: string, name: string): boolean {
    const tag = this.store.getTags().find(t => t.id === tagId)
    if (!tag) return false

    // 检查重名
    if (this.store.getTags().find(t => t.name === name && t.id !== tagId)) {
      return false
    }

    this.store.updateTag(tagId, { name })
    return true
  }

  delete(tagId: string): boolean {
    const tag = this.store.getTags().find(t => t.id === tagId)
    if (!tag) return false

    this.store.removeTag(tagId)
    return true
  }
}
