export const formatRelativeTime = (isoLike: string) => {
  const { t } = useI18n()
  const i = new Date(isoLike.replace(/\.(\d{3})\d+/, '.$1')) // iOS 、兼容ISO
  const now = new Date()
  const diff = (now.getTime() - i.getTime()) / 1000
  if (diff < 60) return t('Just now')
  if (diff < 3600) return `${Math.floor(diff / 60)} ${t('Minutes ago')}`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ${t('Hours ago')}`
  if (diff < 86400 * 2) return t('Yesterday')
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} ${t('Days ago')}`
  // Show dates over 7 days
  const y = i.getFullYear()
  const m = String(i.getMonth() + 1).padStart(2, '0')
  const d = String(i.getDate()).padStart(2, '0')
  const hh = String(i.getHours()).padStart(2, '0')
  const mm = String(i.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${hh}:${mm}`
}
