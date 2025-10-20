/**
 * 路径处理工具函数
 */

/**
 * 从完整路径中提取文件名和路径
 * 兼容Windows(\\)和Unix(/)的路径分隔符
 * @param fullPath 完整文件路径
 * @returns 包含文件名和路径的对象
 */
export const extractFileNameAndPath = (fullPath: string) => {
  // 使用正则表达式分割路径，同时支持Windows(\)和Unix(/)的路径分隔符
  const pathParts = fullPath.split(/[\\/]/);
  const fileName = pathParts.pop() || '';
  
  // 查找文件名在原始路径中的位置，保持原始分隔符格式
  const lastSeparatorIndex = Math.max(
    fullPath.lastIndexOf('/'),
    fullPath.lastIndexOf('\\')
  );
  
  const path = lastSeparatorIndex !== -1 
    ? fullPath.substring(0, lastSeparatorIndex + 1) 
    : '';
  
  return { fileName, path };
};

/**
 * 获取文件扩展名
 * @param fileName 文件名或完整路径
 * @returns 文件扩展名（不含点）
 */
export const getFileExtension = (fileName: string): string => {
  const parts = fileName.split('.');
  if (parts.length <= 1) return '';
  return parts.pop() || '';
};

/**
 * 组合路径和文件名
 * @param path 路径
 * @param fileName 文件名
 * @returns 组合后的完整路径
 */
export const joinPath = (path: string, fileName: string): string => {
  // 确保路径以分隔符结尾
  const lastChar = path.charAt(path.length - 1);
  const separator = path.includes('\\') ? '\\' : '/';
  
  if (lastChar !== '/' && lastChar !== '\\') {
    return path + separator + fileName;
  }
  
  return path + fileName;
};