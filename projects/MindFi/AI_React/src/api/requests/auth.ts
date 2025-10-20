import {request} from "@/api/config";
import {AuthNonce, LoginModel} from "@/api/interface/auth.ts";

/**
 * 获取个人信息
 * @param data
 * @constructor
 */
function personal(data: AuthNonce) {
    return request({
        url: '/user/auth/nonce',
        method: 'POST',
        data
    })
}




/**
 * 登录
 * @param data
 * @constructor
 */
function login(data: LoginModel) {
    return request({
        url: '/login',
        method: 'POST',
        data
    })
}

/**
 * 认证
 */
function auth() {
    return request({
        url: '/auth'
    })
}

/**
 * 退出登录
 */
function logout() {
    return request({
        url: '/logout'
    })
}

export default {
    login,
    auth,
    logout,
    personal
}