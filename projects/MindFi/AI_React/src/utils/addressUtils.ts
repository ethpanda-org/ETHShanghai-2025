/**
 * 隐藏中间部分的字符串（常用于钱包地址展示）
 * @param str 原始字符串
 * @param front 前面保留几位
 * @param back 后面保留几位
 * @returns 处理后的字符串
 */
export function hiddenMiddle(str: string, front: number = 6, back: number = 4): string {
    if (!str) return "";
    if (str.length <= front + back) return str;
    return `${str.slice(0, front)}...${str.slice(-back)}`;
}