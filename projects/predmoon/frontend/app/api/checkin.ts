import { doFetch } from '@/composables/doFetch'

export const getCheckinJackpot = () => {
  return doFetch('/api/checkin/jackpot', { method: 'GET' })
}

export const getCheckinStatus = (jackpotId: number) => {
  return doFetch('/api/checkin/status', { method: 'GET', query: { jackpotId } })
}

export const postCheckin = (params: any) => {
  return doFetch('/api/checkin/do', { method: 'POST', body: params })
}

export const redeemMakeupCard = (params: any) => {
  return doFetch('/api/checkin/redeem', { method: 'POST', body: params })
}

export const checkinRank = (jackpotId: number) => {
  return doFetch('/api/checkin/rank', { method: 'GET', query: { jackpotId } })
}

export const checkinRecords = (jackpotId: number) => {
  return doFetch('/api/checkin/records', { method: 'GET', query: { jackpotId } })
}

export const inviteRecords = () => {
  return doFetch('/api/invite/records', { method: 'GET', query: { id: 2 } })
}

export const inviteRank = () => {
  return doFetch('/api/invite/topic', { method: 'GET', query: { id: 2 } })
}

export const checkinLog = () => {
  return doFetch('/api/assets/topic', { method: 'GET', query: { id: 2 } })
}

