import request from "../config";
import {AccessStatus, ProfitStatus} from "../interface/access";

/**
 * 获取今日用量
 */
function accessGetStatus(address: string) {
    return request<AccessStatus>({
        url: "/access/status",
        method: "get",
        params: { address },
    });
}
/**
 * 获取用户盈利情况
 */
function getUserProfitStatus(address: string) {
    return request<ProfitStatus>({
        url: "/api/user/profit/status",
        method: "get",
        params: { address },
    });
}

export default {
    accessGetStatus,
    getUserProfitStatus
};
