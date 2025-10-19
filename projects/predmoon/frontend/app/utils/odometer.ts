import 'odometer/themes/odometer-theme-default.css'
import type { OdometerOptions } from 'odometer'

let OdometerCtor: any | null = null

// 确保在客户端懒加载 odometer 构造器
export async function ensureOdometer() {
  if (OdometerCtor || typeof window === 'undefined') return OdometerCtor
  const mod = await import('odometer')
  OdometerCtor = (mod as any).default || (mod as any)
  return OdometerCtor
}

/**
 * 创建 Odometer 实例
 * @param el 绑定元素
 * @param options 可选配置，支持 initial 初始值、format、duration 等
 */
export async function createOdometer(
  el: HTMLElement,
  options?: Partial<OdometerOptions> & { initial?: number }
) {
  const Ctor = await ensureOdometer()
  if (!Ctor || !el) return null

  const {
    initial = 0,
    format = '(,ddd)',
    duration = 800,
    ...rest
  } = options || {}

  const inst = new Ctor({
    el,
    value: initial,
    format,
    duration,
    ...rest,
  })

  return inst
}
