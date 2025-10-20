/**
 * Safe Wallet Signature Utilities
 * 使用消息哈希方式处理 Safe 钱包签名
 */

import SafeAppsSDK from '@safe-global/safe-apps-sdk';

export interface SafeSignatureOptions {
  message: string;
  address: string;
  chainId?: number;
}

export interface SafeSignatureResult {
  signature: string;
  method: string;
  success: boolean;
  error?: string;
}

/**
 * 创建 Safe Apps SDK 实例
 */
function createSafeSDK(): SafeAppsSDK {
  return new SafeAppsSDK({
    allowedDomains: [/gnosis-safe.io/, /app.safe.global/, /safe.global/],
    debug: process.env.NODE_ENV === 'development'
  });
}

/**
 * Safe 消息哈希签名方法
 */
async function signWithMessageHash(
  sdk: SafeAppsSDK,
  message: string
): Promise<SafeSignatureResult> {
  try {
    
    // 计算消息哈希
    const messageHash = await sdk.safe.calculateMessageHash(message);
    console.log('Message hash calculated:', messageHash);
    
    // 使用消息哈希作为签名标识
    const signature = `safe-hash-${messageHash}`;
    
    console.log('✅ Message hash signature successful', signature);
    return {
      signature,
      method: 'safe_messageHash',
      success: true
    };
  } catch (error) {
    console.log('❌ Message hash failed:', error);
    return {
      signature: '',
      method: 'safe_messageHash',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 主要的 Safe 钱包签名函数
 * 使用消息哈希签名方法
 */
export async function signWithSafe(options: SafeSignatureOptions): Promise<SafeSignatureResult> {
  const { message, address, chainId = 1 } = options;
  
  const sdk = createSafeSDK();
  
  // 直接使用消息哈希签名方法
  return await signWithMessageHash(sdk, message);
}

/**
 * 检查 Safe SDK 是否可用
 */
export async function isSafeSDKAvailable(): Promise<boolean> {
  try {
    const sdk = createSafeSDK();
    
    // 尝试获取 Safe 信息来验证 SDK 是否工作
    await Promise.race([
      sdk.safe.getInfo(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 3000)
      )
    ]);
    
    return true;
  } catch (error) {
    console.log('Safe SDK not available:', error);
    return false;
  }
}