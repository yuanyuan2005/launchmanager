import { useGroupStore } from '../stores/group-store'

export function useGroups() {
  const store = useGroupStore()

  return {
    groups: store.groups,
    loadGroups: store.loadGroups,
    create: store.createGroup,
    rename: store.renameGroup,
    remove: store.deleteGroup,
    getGroup: store.getGroup
  }
}
