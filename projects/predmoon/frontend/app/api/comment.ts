import { doFetch } from '@/composables/doFetch'

/**
 *  get topic comment list
 * @param {number} topicId
 * @returns
 */
export const getCommentList = async (topicId:number) => {
  return await doFetch('/api/comment/list', {
    method: 'GET',
    query: { topicId }
  })
}

/**
 *  post topic comment
 * @param params { topicId: number, content: string }
 * @returns
 */

export const postComment = async (params: { topicId: number, content: string }) => {
  return await doFetch('/api/comment/do', {
    method: 'POST',
    body: params
  })
}
