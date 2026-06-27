import { Tray, Menu, nativeImage, app, type NativeImage } from 'electron'
import { join } from 'path'

export class TrayManager {
  private tray: Tray | null = null
  private showCallback: () => void
  private quitCallback: () => void

  constructor(show: () => void, quit: () => void) {
    this.showCallback = show
    this.quitCallback = quit
    this.create()
  }

  private create(): void {
    // 创建 16x16 托盘图标（用简单的 1x1 占位，后续替换为实际图标）
    const iconPath = join(app.getAppPath(), 'resources', 'icon.png')
    let icon: NativeImage

    try {
      icon = nativeImage.createFromPath(iconPath)
      if (icon.isEmpty()) {
        icon = this.createPlaceholderIcon()
      }
    } catch {
      icon = this.createPlaceholderIcon()
    }

    this.tray = new Tray(icon.resize({ width: 16, height: 16 }))
    this.tray.setToolTip('LaunchHub - 启动管理器')

    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示面板',
        click: () => this.showCallback()
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => this.quitCallback()
      }
    ])

    this.tray.setContextMenu(contextMenu)
    this.tray.on('click', () => this.showCallback())
  }

  private createPlaceholderIcon(): NativeImage {
    // 创建一个简单的 16x16 图标
    const size = 16
    const buffer = Buffer.alloc(size * size * 4)

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const offset = (y * size + x) * 4
        // 简单的蓝色圆形
        const cx = 7.5, cy = 7.5, r = 6
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
        if (dist <= r) {
          buffer[offset] = 59      // B
          buffer[offset + 1] = 130  // G
          buffer[offset + 2] = 246  // R
          buffer[offset + 3] = 255  // A
        } else {
          buffer[offset + 3] = 0
        }
      }
    }

    return nativeImage.createFromBuffer(buffer, { width: size, height: size })
  }

  destroy(): void {
    this.tray?.destroy()
    this.tray = null
  }
}
