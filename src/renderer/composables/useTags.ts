import { useTagStore } from '../stores/tag-store'

export function useTags() {
  const store = useTagStore()

  return {
    tags: store.tags,
    loadTags: store.loadTags,
    create: store.createTag,
    rename: store.renameTag,
    remove: store.deleteTag,
    getTag: store.getTag
  }
}
