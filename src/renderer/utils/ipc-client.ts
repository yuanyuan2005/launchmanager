/** 格式化显示文件大小 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}

/** 根据文件类型返回图标名称 */
export function getTypeIcon(type: string): string {
  switch (type) {
    case 'shortcut':
      return 'i-mdi-link-variant'
    case 'folder':
      return 'i-mdi-folder'
    default:
      return 'i-mdi-file-outline'
  }
}
