import { app, nativeImage, shell } from 'electron'
import { statSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { extname, join } from 'path'
import { exec } from 'child_process'

/** 预设文件夹图标 SVG data URL */
const FOLDER_ICON_SVG = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#F6C23E">
  <path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
</svg>
`)}`

/** 判断路径是否含中文字符 */
function hasChineseChar(str: string): boolean {
  return /[一-鿿]/.test(str)
}

/** 用 PowerShell 解析 .lnk 快捷方式的目标路径（异步，绕过 Electron 中文路径 bug） */
function getShortcutTarget(lnkPath: string): Promise<string | null> {
  return new Promise((resolve) => {
    // 转义单引号防止命令注入
    const safePath = lnkPath.replace(/'/g, "''")
    const cmd = `powershell -Command "[Console]::OutputEncoding = [Text.Encoding]::UTF8; $ws = New-Object -ComObject WScript.Shell; $ws.CreateShortcut('${safePath}').TargetPath"`
    exec(cmd, { encoding: 'utf8', timeout: 5000 }, (err, stdout) => {
      if (err) { resolve(null); return }
      const result = stdout.trim()
      resolve(result || null)
    })
  })
}

/**
 * 将 data URL（base64 png）解码写入磁盘
 * @returns 相对于 iconsDir 的文件名，如 "proj_xxx.png"；失败返回 null
 */
export function saveIconToDisk(dataUrl: string, iconDir: string, projectId: string): string | null {
  try {
    // 格式 1: base64 图片（PNG 等）—— "data:image/png;base64,..."
    const base64Match = dataUrl.match(/^data:image\/\w+;base64,(.+)$/)
    if (base64Match) {
      const base64 = base64Match[1]
      if (!base64 || base64.length < 100) return null

      const buffer = Buffer.from(base64, 'base64')

      if (!existsSync(iconDir)) {
        mkdirSync(iconDir, { recursive: true })
      }

      const filename = `${projectId}.png`
      writeFileSync(join(iconDir, filename), buffer)
      return filename
    }

    // 格式 2: 百分号编码的 SVG —— "data:image/svg+xml,%3Csvg..."
    const svgMatch = dataUrl.match(/^data:image\/svg\+xml,(.+)$/)
    if (svgMatch) {
      const svgContent = decodeURIComponent(svgMatch[1])
      if (!svgContent || svgContent.length < 50) return null

      if (!existsSync(iconDir)) {
        mkdirSync(iconDir, { recursive: true })
      }

      const filename = `${projectId}.svg`
      writeFileSync(join(iconDir, filename), svgContent, 'utf-8')
      return filename
    }

    return null
  } catch (err) {
    console.error('[icon-resolver] 保存图标文件失败:', projectId, err)
    return null
  }
}

/**
 * 解析文件的真实图标为 data URL（内部使用，最终会被 saveIconToDisk 持久化）
 *
 * - .lnk 快捷方式：用 shell.readShortcutLink()（英文路径）或 PowerShell（中文路径）
 *   解析目标 exe 路径，再对目标获取图标
 * - 文件夹：直接返回预设 SVG 图标
 * - 普通文件：优先缩略图，回退注册表关联图标
 */
export async function resolveFileIcon(filePath: string): Promise<string | null> {
  try {
    if (statSync(filePath).isDirectory()) {
      return FOLDER_ICON_SVG
    }
    // 非目录：继续走原有逻辑
  } catch {
    return null
  }

  let iconPath = filePath

  // 对 .lnk 快捷方式：解析目标路径
  const isLnk = extname(filePath).toLowerCase() === '.lnk'
  if (isLnk) {
    if (hasChineseChar(filePath)) {
      // 中文路径：Electron shell.readShortcutLink 有 bug，改用 PowerShell 解析目标
      const target = await getShortcutTarget(filePath)
      if (target) iconPath = target
    } else {
      // 英文路径：用 Electron API 解析目标
      try {
        const details = shell.readShortcutLink(filePath)
        if (details.icon || details.target) {
          iconPath = details.icon || details.target
        }
      } catch (err) {
        console.error('[icon-resolver] 快捷方式解析失败:', filePath, err)
      }
    }
  }

  // ===== 对 .lnk 优先用 getFileIcon（兼容性更好，getFileIcon 对目标 exe 更可靠） =====
  if (isLnk) {
    try {
      const icon = await app.getFileIcon(iconPath, { size: 'large' })
      if (!icon.isEmpty()) {
        const dataUrl = icon.toDataURL()
        if (dataUrl && dataUrl.length > 100) return dataUrl
      }
    } catch {
      // getFileIcon 失败，回退到缩略图
    }
    // .lnk 回退：缩略图
    try {
      const thumbnail = await nativeImage.createThumbnailFromPath(iconPath, { size: 'large' })
      if (!thumbnail.isEmpty()) {
        const dataUrl = thumbnail.toDataURL()
        if (dataUrl && dataUrl.length > 100) return dataUrl
      }
    } catch {
      // 缩略图生成失败
    }
  }

  // 非 .lnk 文件
  if (!isLnk) {
    if (hasChineseChar(filePath)) {
      // 中文路径：createThumbnailFromPath 会返回错误默认图标，所以 getFileIcon 优先
      try {
        const icon = await app.getFileIcon(iconPath, { size: 'large' })
        if (!icon.isEmpty()) {
          const dataUrl = icon.toDataURL()
          if (dataUrl && dataUrl.length > 100) return dataUrl
        }
      } catch {
        // getFileIcon 失败，回退到缩略图
      }
      try {
        const thumbnail = await nativeImage.createThumbnailFromPath(iconPath, { size: 'large' })
        if (!thumbnail.isEmpty()) {
          const dataUrl = thumbnail.toDataURL()
          if (dataUrl && dataUrl.length > 100) return dataUrl
        }
      } catch {
        // 缩略图生成失败
      }
    } else {
      // 英文路径：缩略图优先（更高质量）
      try {
        const thumbnail = await nativeImage.createThumbnailFromPath(iconPath, { size: 'large' })
        if (!thumbnail.isEmpty()) {
          const dataUrl = thumbnail.toDataURL()
          if (dataUrl && dataUrl.length > 100) return dataUrl
        }
      } catch {
        // 缩略图生成失败，回退
      }
      try {
        const icon = await app.getFileIcon(iconPath, { size: 'large' })
        if (!icon.isEmpty()) {
          const dataUrl = icon.toDataURL()
          if (dataUrl && dataUrl.length > 100) return dataUrl
        }
      } catch (err) {
        console.error('[icon-resolver] 获取图标失败:', iconPath, err)
      }
    }
  }

  return null
}
