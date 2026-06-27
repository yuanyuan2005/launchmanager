import { globalShortcut } from 'electron'

export class HotkeyManager {
  private showCallback: () => void
  private hideCallback: () => void
  private currentAccelerator: string | null = null
  private isVisible = false

  constructor(show: () => void, hide: () => void) {
    this.showCallback = show
    this.hideCallback = hide
  }

  /** 注册全局热键 */
  register(accelerator: string): boolean {
    // 先注销旧热键
    this.unregister()

    try {
      const ok = globalShortcut.register(accelerator, () => {
        if (this.isVisible) {
          this.hideCallback()
          this.isVisible = false
        } else {
          this.showCallback()
          this.isVisible = true
        }
      })

      if (ok) {
        this.currentAccelerator = accelerator
        console.log(`[Hotkey] Registered: ${accelerator}`)
        return true
      } else {
        console.error(`[Hotkey] Failed to register: ${accelerator}`)
        return false
      }
    } catch (err) {
      console.error('[Hotkey] Error registering:', err)
      return false
    }
  }

  /** 注销热键 */
  unregister(): void {
    if (this.currentAccelerator) {
      globalShortcut.unregister(this.currentAccelerator)
      this.currentAccelerator = null
    }
  }

  /** 更新窗口可见状态（供外部调用） */
  setVisible(visible: boolean): void {
    this.isVisible = visible
  }
}
