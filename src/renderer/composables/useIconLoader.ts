import { onBeforeUnmount } from 'vue'

type LoadCallback = () => void

/** 模块级共享一个 IntersectionObserver，避免每张卡片各自创建 */
let observer: IntersectionObserver | null = null
const pendingCallbacks = new WeakMap<Element, LoadCallback>()

function getObserver(): IntersectionObserver {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const cb = pendingCallbacks.get(entry.target)
            if (cb) {
              cb()
              pendingCallbacks.delete(entry.target)
              observer!.unobserve(entry.target)
            }
          }
        }
      },
      {
        // 提前 150px 开始加载，用户滚动到卡片时图标大概率已就绪
        rootMargin: '150px',
      },
    )
  }
  return observer
}

/**
 * 视口懒加载钩子：元素进入视口时触发回调（仅触发一次）
 * 用法：在 onMounted 中调用 observe(el, loadIcon)
 */
export function useIconLoader() {
  let el: Element | null = null

  function observe(element: Element, callback: LoadCallback): void {
    el = element
    pendingCallbacks.set(element, callback)
    getObserver().observe(element)
  }

  onBeforeUnmount(() => {
    if (el) {
      getObserver().unobserve(el)
      pendingCallbacks.delete(el)
    }
  })

  return { observe }
}
