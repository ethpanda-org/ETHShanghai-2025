declare module 'odometer' {
  export interface OdometerOptions {
    el: Element
    value?: number | string
    format?: string
    duration?: number
    theme?: string
    // 允许将来扩展更多配置项
    [key: string]: any
  }

  export default class Odometer {
    constructor(options: OdometerOptions)
    el: Element
    value: number | string
    update(val: number | string): void
  }
}
