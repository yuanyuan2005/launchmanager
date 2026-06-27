import { DataStore } from './data-store'
import { generateId } from './desktop-scanner'
import type { Group } from '../types'

export class GroupManager {
  private store: DataStore

  constructor(store: DataStore) {
    this.store = store
  }

  getAll(): Group[] {
    return this.store.getGroups()
  }

  create(name: string): Group | null {
    // 检查重名
    if (this.store.getGroups().find(g => g.name === name)) {
      return null
    }

    const maxOrder = Math.max(...this.store.getGroups().map(g => g.order), -1)
    const group: Group = {
      id: generateId('grp'),
      name,
      isDefault: false,
      order: maxOrder + 1
    }
    this.store.addGroup(group)
    return group
  }

  moveUp(groupId: string): Group[] | null {
    const groups = [...this.store.getGroups()]
    const idx = groups.findIndex(g => g.id === groupId)
    if (idx <= 0) return null

    // 在副本上完成排序操作
    const [item] = groups.splice(idx, 1)
    groups.splice(idx - 1, 0, item)
    groups.forEach((g, i) => { g.order = i })

    // 通过 DataStore API 写回，而非直接修改内部引用
    this.store.replaceGroups(groups)
    return groups
  }

  moveDown(groupId: string): Group[] | null {
    const groups = [...this.store.getGroups()]
    const idx = groups.findIndex(g => g.id === groupId)
    if (idx < 0 || idx >= groups.length - 1) return null

    // 在副本上完成排序操作
    const [item] = groups.splice(idx, 1)
    groups.splice(idx + 1, 0, item)
    groups.forEach((g, i) => { g.order = i })

    // 通过 DataStore API 写回，而非直接修改内部引用
    this.store.replaceGroups(groups)
    return groups
  }

  rename(groupId: string, name: string): boolean {
    const group = this.store.getGroups().find(g => g.id === groupId)
    if (!group || group.isDefault) return false

    // 检查重名
    if (this.store.getGroups().find(g => g.name === name && g.id !== groupId)) {
      return false
    }

    this.store.updateGroup(groupId, { name })
    return true
  }

  delete(groupId: string): boolean {
    const group = this.store.getGroups().find(g => g.id === groupId)
    if (!group || group.isDefault) return false

    // 将该分组下的所有项目迁移到默认分组
    const defaultGroup = this.store.getGroups().find(g => g.isDefault)!
    const projects = this.store.getProjects()

    for (const project of projects) {
      if (project.groupId === groupId) {
        this.store.updateProject(project.id, { groupId: defaultGroup.id })
      }
    }

    this.store.removeGroup(groupId)
    return true
  }
}
