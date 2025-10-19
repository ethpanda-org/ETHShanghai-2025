import { useState } from 'react'

// 简单的内存路由 hook
export default function useRouter() {
  const [route, setRoute] = useState({ name: "markets", params: {} })
  
  const push = (name, params = {}) => setRoute({ name, params })
  
  return { route, push }
}
