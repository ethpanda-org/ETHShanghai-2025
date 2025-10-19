import Request from '@/utils/request'


// Check the user's wallet balance
export const getUserBalance = (params = {}) => {
    return Request({
        url: `/app-api/topic/user/getBalance`,
        method: 'get'
    })
}

// Check the user's portfolio balance
export const getUserPortfolio = () => {
    return Request({
        url: `/app-api/topic/user/getPortfolio`,
        method: 'get'
    })
}

// Check the user's profile information
export const getUserProfile = (params = {}) => {
    return Request({
        url: `/app-api/topic/user/profile`,
        method: 'post',
        data: params
    })
}

// Check the user's basic information
export const getUserInfo = (params = {}) => {
    return Request({
        url: `/app-api/topic/user/get`,
        method: 'get',
        params
    })
}

// Update the user's basic information
export const updateUserSettings = (params = {}) => {
    return Request({
        url: `/app-api/topic/user/update`,
        method: 'post',
        data: params
    })
}

// Send email verification code
export const sendEmailCode = (params = {}) => {
    return Request({
        url: `/app-api/topic/user/sendEmailCode`,
        method: 'post',
        data: params
    })
}

// Bind email
export const bindEmail = (params = {}) => {
    return Request({
        url: `/app-api/topic/user/bindEmail`,
        method: 'post',
        data: params
    })
}

// Update the user's notification settings
export const updateNotify = (params = {}) => {
    return Request({
        url: `/app-api/topic/user/updateNotify`,
        method: 'post',
        data: params
    })
}

// Check the user's holding information
export const getUserHoldInfo = (params = {}) => {
    return Request({
        url: `/app-api/topic/user/userHoldInfo`,
        method: 'post',
        data: params
    })
}

// Check the user's invite code
export const updateInviteCode = (params = {}) => {
    return Request({
        url: `/app-api/topic/user/updateInviteCode`,
        method: 'post',
        data: params
    })
}

// Redemption signature information
export const getClaimSignData = (params = {}) => {
    return Request({
        url: `/app-api/topic/user/getClaimSignData`,
        method: 'post',
        data: params
    })
}

// Position redemption
export const cashOut = (params = {}) => {
    return Request({
        url: `/app-api/topic/user/cashOut`,
        method: 'post',
        data: params
    })
}

// Contract configuration information
export const userConfig = () => {
    return Request({
        url: `/app-api/topic/user/config`,
        method: 'get',
    })
}

// User token authorization
export const approveSign = (params = {}) => {
    return Request({
        url: `/app-api/topic/user/approveSign`,
        method: 'post',
        data: params
    })
}

// Obtain task information
export const getUserTask = (params = {}) => {
    return Request({
        url: `/app-api/topic/task/list`,
        method: 'get',
        params
    })
}

// Receive a prize in mission
export const userTaskReceive = (params = {}) => {
    return Request({
        url: `/app-api/topic/task/receive`,
        method: 'get',
        params
    })
}

// Apply to become a broker
export const applyBroker = (params = {}) => {
    return Request({
        url: `/app-api/topic/user/broker/apply`,
        method: 'post',
        data: params
    })
}

// Get broker settlement information
export const getBrokerSettleInfo = (params = {}) => {
    return Request({
        url: `/app-api/topic/user/broker/settleInfo`,
        method: 'get',
        params
    })
}

// Get the broker settlement details page
export const getBrokerSettleDetail = (params = {}) => {
    return Request({
        url: `/app-api/topic/user/broker/settleDetail`,
        method: 'post',
        data: params
    })
}

// Agent withdrawal log pagination
export const getBrokerWithdraw = (params = {}) => {
    return Request({
        url: `/app-api/topic/user/broker/withdraw/page`,
        method: 'post',
        data: params
    })
}

// Apply to become an agent
export const applyUserMarketing = (params = {}) => {
    return Request({
        url: `/app-api/topic/marketing/user/apply`,
        method: 'post',
        data: params
    })
}

// Agency application history
export const getUserMarketing = (params = {}) => {
    return Request({
        url: `/app-api/topic/marketing/user/status`,
        method: 'post',
        data: params
    })
}