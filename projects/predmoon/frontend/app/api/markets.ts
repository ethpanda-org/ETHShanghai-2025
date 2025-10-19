import Request from '@/utils/request'
import type { ApiResponse } from '@/types'
import * as Types from '@/types/market'

// get topics pagenations
export const getTopicsList = (params = {}) => {
    return Request({
        url: '/app-api/topic/page',
        method: 'post',
        data: params
    })
}

// get topics recommend pagenations (home)
export const getTopicsRecommend = (params = {}) => {
    return Request({
        url: '/app-api/topic/recommend',
        method: 'post',
        data: params
    })
}

// add to my watchlist
export const addTopicsWatchlist = (params = {}) => {
    return Request({
        url: '/app-api/topic/user/watchlist/add',
        method: 'post',
        data: params
    })
}

// get related topics under a series
export const getSeriesList = (params = {}) => {
    return Request({
        url: '/app-api/topic/series/topics',
        method: 'post',
        data: params
    })
}

// get topic details
export const getTopicsDetails = (id: number) => {
    return Request<any, ApiResponse<Types.TopicsDetailRespVO>>({
        url: `/app-api/topic/get?id=${id}`,
        method: 'get',
    })
}

// get topics comments pagenations
export const getTopicsCommentsList = (params = {}) => {
    return Request({
        url: '/app-api/topic/comments/page',
        method: 'get',
        params
    })
}

// create topics comments
export const createTopicsComments = (params = {}) => {
    return Request({
        url: '/app-api/topic/comments/create',
        method: 'post',
        data: params
    })
}

// delete topics comments
export const DeleteTopicsComment = (params = {}) => {
    return Request({
        url: '/app-api/topic/comments/delete',
        method: 'delete',
        params
    })
}

// click topics comments reaction
export const getTopicsCommentsReaction = (params = {}) => {
    return Request({
        url: '/app-api/topic/comments/reaction',
        method: 'post',
        data: params
    })
}

// get user hold ranking
export const getTopicsTopHolder = (params = {}) => {
    return Request({
        url: '/app-api/topic/markets/topHolder',
        method: 'post',
        data: params
    })
}

// get related topics information, need to maintain related topics in the topic
export const getTopicsRelated = (params = {}) => {
    return Request({
        url: '/app-api/topic/relatopics',
        method: 'get',
        params
    })
}

// get total order amount
export const getOrderAmount = (params = {}) => {
    return Request({
        url: '/app-api/topic/order/amount',
        method: 'get',
        data: params
    })
}

// get topics order preview
export const getTopicsOrderPreview = (params = {}) => {
    return Request({
        url: '/app-api/topic/order/preview',
        method: 'post',
        data: params
    })
}

// create topics order
export const getTopicsOrderCreate = (params = {}) => {
    return Request({
        url: '/app-api/topic/order/create',
        method: 'post',
        data: params
    })
}

// check topics order
export const checkTopicsOrder = (params = {}) => {
    return Request({
        url: '/app-api/topic/order/checkHold',
        method: 'post',
        data: params
    })
}

// get all topics order books information
export const getOrderBooksAll = (params = {}) => {
    return Request({
        url: '/app-api/topic/markets/orderBooksAll',
        method: 'post',
        data: params
    })
}

// get latest market information for all topics
export const getNewPricesMarkets = (params = {}) => {
    return Request({
        url: '/app-api/topic/markets/lastPricesAll',
        method: 'post',
        data: params
    })
}


// get user hold information for a specific market
export const getUserHoldInfo = (params = {}) => {
    return Request({
        url: '/app-api/topic/user/userMarketHoldInfo',
        method: 'post',
        data: params
    })
}

// get user order information for a specific market
export const getUserOrderInfo = (params = {}) => {
    return Request({
        url: '/app-api/topic/user/userMarketOrderInfo',
        method: 'post',
        data: params
    })
}

// cancel user order
export const cancelUserOrder = (params = {}) => {
    return Request({
        url: '/app-api/topic/order/cancel',
        method: 'post',
        data: params
    })
}

// get market price change information
export const getPriceHistory = (params = {}) => {
    return Request({
        url: '/app-api/topic/markets/priceHistory',
        method: 'post',
        data: params
    })
}

// get topic chat interface
export const getSummary = (params = {}) => {
    return Request({
        url: '/app-api/ai/topic/summary',
        method: 'post',
        data: params
    })
}
