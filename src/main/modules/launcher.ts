import { shell } from 'electron'
import { extname } from 'path'

/**
 * 启动/打开一个项目
 * - .lnk 快捷方式 → shell.openPath 会自动解析并启动目标程序
 * - 文件 → 用系统默认程序打开
 * - 文件夹 → 在资源管理器中打开
 */
export async function launchProject(sourcePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const ext = extname(sourcePath).toLowerCase()

    if (ext === '.lnk') {
      // shell.openPath 可以直接打开 .lnk，系统会解析到目标程序
      const result = await shell.openPath(sourcePath)
      if (result) {
        return { success: false, error: result }
      }
    } else {
      // 文件或文件夹
      const result = await shell.openPath(sourcePath)
      if (result) {
        return { success: false, error: result }
      }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error' }
  }
}

/** 在资源管理器中打开并选中文件 */
export function openFileLocation(sourcePath: string): { success: boolean; error?: string } {
  try {
    shell.showItemInFolder(sourcePath)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error' }
  }
}
