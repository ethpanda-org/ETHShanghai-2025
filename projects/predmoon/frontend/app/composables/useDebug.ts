import debug from 'debug'

export const useDebug = ctx => {
  const debugInstance =  debug(ctx)
  return obj => {
    Object.keys(obj).forEach(key => {
      debugInstance(key, obj[key])
    })
  }
}
