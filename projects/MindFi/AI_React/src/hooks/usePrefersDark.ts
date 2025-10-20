// src/hooks/usePrefersDark.ts
// 用于判断系统主题颜色
import { useEffect, useState } from 'react'

export function usePrefersDark(): boolean {
    const [isDark, setIsDark] = useState(
        window.matchMedia('(prefers-color-scheme: dark)').matches
    )

    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)')
        // console.log(isDark)
        console.log(mq)

        const onChange = (e: MediaQueryListEvent) => setIsDark(e.matches)
        // console.log(isDark)
        mq.addEventListener('change', onChange)
        return () => mq.removeEventListener('change', onChange)
    }, [])

    return isDark
}