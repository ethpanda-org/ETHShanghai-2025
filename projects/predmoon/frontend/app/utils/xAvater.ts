export const xAvatar = (avatar: string) => {
  if(!avatar) return '/puzzle-logo.png'
  return avatar.replace('_normal', '').replace('_400x400', '')
}
