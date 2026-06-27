import { readdirSync, statSync } from 'fs'
import { join, basename, extname } from 'path'
import { shell } from 'electron'
import { execSync } from 'child_process'
import type { Project, ProjectType } from '../types'

const DESKTOP_PATH = join(process.env.USERPROFILE || 'C:\\Users\\Public', 'Desktop')

/** 生成唯一 ID */
export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export interface ScanResult {
  name: string
  sourcePath: string
  type: ProjectType
}

/** 判断文件类型 */
function getProjectType(filePath: string): ProjectType | null {
  const ext = extname(filePath).toLowerCase()

  if (ext === '.lnk') {
    return 'shortcut'
  }

  try {
    const stat = statSync(filePath)
    if (stat.isDirectory()) return 'folder'
    if (stat.isFile()) return 'file'
  } catch {
    return null
  }

  return null
}

/** 解析 .lnk 文件的显示名称（去掉 .lnk 后缀） */
function getDisplayName(filePath: string): string {
  const base = basename(filePath)
  if (extname(base).toLowerCase() === '.lnk') {
    return base.slice(0, -4)
  }
  return base
}

/** 扫描桌面目录，返回所有可导入项目 */
export function scanDesktop(): ScanResult[] {
  const results: ScanResult[] = []

  try {
    const entries = readdirSync(DESKTOP_PATH)

    for (const entry of entries) {
      const fullPath = join(DESKTOP_PATH, entry)
      const type = getProjectType(fullPath)

      if (type) {
        results.push({
          name: getDisplayName(fullPath),
          sourcePath: fullPath,
          type
        })
      }
    }
  } catch (err) {
    console.error('[DesktopScanner] Failed to scan desktop:', err)
  }

  return results
}

/** 从单个路径创建项目数据 */
export function createProjectFromPath(
  filePath: string,
  groupId: string,
  tagIds: string[] = []
): Project | null {
  const type = getProjectType(filePath)
  if (!type) return null

  return {
    id: generateId('proj'),
    name: getDisplayName(filePath),
    sourcePath: filePath,
    type,
    groupId,
    tagIds,
    addedTime: new Date().toISOString(),
    isValid: true
  }
}

/** 判断路径是否含中文字符 */
function hasChineseChar(str: string): boolean {
  return /[一-鿿]/.test(str)
}

/** 用 PowerShell 解析 .lnk 快捷方式的目标路径（绕过 Electron 中文路径 bug） */
function getShortcutTarget(lnkPath: string): string | null {
  try {
    // 转义单引号防止命令注入
    const safePath = lnkPath.replace(/'/g, "''")
    const cmd = `powershell -Command "[Console]::OutputEncoding = [Text.Encoding]::UTF8; $ws = New-Object -ComObject WScript.Shell; $ws.CreateShortcut('${safePath}').TargetPath"`
    const result = execSync(cmd, { encoding: 'utf8', timeout: 5000 }).trim()
    return result || null
  } catch {
    return null
  }
}

/** 检查路径是否有效 */
export function checkPathValid(sourcePath: string): boolean {
  try {
    // 对于 .lnk 文件，尝试解析目标路径
    if (extname(sourcePath).toLowerCase() === '.lnk') {
      let targetPath: string | null = null

      if (hasChineseChar(sourcePath)) {
        // 中文路径：shell.readShortcutLink 有 bug，改用 PowerShell 解析
        targetPath = getShortcutTarget(sourcePath)
      } else {
        // 英文路径：用 Electron API 解析
        try {
          const target = shell.readShortcutLink(sourcePath)
          if (target && target.target) {
            targetPath = target.target
          }
        } catch {
          // 解析失败，忽略
        }
      }

      if (targetPath) {
        return existsSync(targetPath) || existsSync(sourcePath)
      }
    }
    return existsSync(sourcePath)
  } catch {
    try {
      return existsSync(sourcePath)
    } catch {
      return false
    }
  }
}

function existsSync(p: string): boolean {
  try {
    statSync(p)
    return true
  } catch {
    return false
  }
}
