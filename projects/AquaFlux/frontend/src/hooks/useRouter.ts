import { useState, useEffect } from 'react'

interface RouteParams {
  [key: string]: string
}

interface Route {
  name: string
  params: RouteParams
}

type RouteName = 'markets' | 'swap' | 'structure' | 'portfolio'

// URL-based routing hook
export default function useRouter() {
  const [route, setRoute] = useState<Route>({ name: "markets", params: {} })
  
  // Parse URL to get current route
  const parseUrl = (): Route => {
    const path = window.location.pathname
    const search = window.location.search
    const params = new URLSearchParams(search)
    
    let name: RouteName = "markets" // default
    if (path === "/" || path === "/markets") {
      name = "markets"
    } else if (path === "/swap") {
      name = "swap"
    } else if (path === "/structure") {
      name = "structure"
    } else if (path === "/portfolio") {
      name = "portfolio"
    }
    
    // Convert URLSearchParams to object
    const paramsObj: RouteParams = {}
    for (const [key, value] of params.entries()) {
      paramsObj[key] = value
    }
    
    return { name, params: paramsObj }
  }
  
  // Initialize route from URL
  useEffect(() => {
    const currentRoute = parseUrl()
    setRoute(currentRoute)
    
    // Listen for browser back/forward
    const handlePopState = () => {
      const newRoute = parseUrl()
      setRoute(newRoute)
    }
    
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])
  
  // Navigate to new route
  const push = (name: RouteName, params: RouteParams = {}) => {
    const newRoute: Route = { name, params }
    setRoute(newRoute)
    
    // Update URL
    let path = `/${name}`
    if (name === "markets") {
      path = "/markets"
    }
    
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        searchParams.set(key, value.toString())
      }
    })
    
    const fullPath = searchParams.toString() ? `${path}?${searchParams.toString()}` : path
    window.history.pushState(null, '', fullPath)
  }
  
  return { route, push }
}