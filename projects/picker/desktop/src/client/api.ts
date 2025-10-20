// API Service
// 提供与 Tauri 后端通信的接口
import { invoke } from '@tauri-apps/api/core';
import type { UserSystemInfoResponse, RegisterResponse, UserInfo, SystemInfo, PickerListResponse, 
  CreateOrderResponse, OrderStatus, OrderListResponse, OrderInfo, TransferToRequest, 
  TransferToResponse, ReplacePrivateKeyRequest, ReplacePrivateKeyResponse } from '../types';

// 服务器连接状态接口
interface ConnectionStatus {
  is_connected: boolean;
  response_time_ms: number;
  server_status: string;
  auth_valid: boolean;
  error_message: string | null;
}

// 模拟延迟
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// 模拟用户数据库
const localUsers = [
  {
    id: '1',
    email: 'user@example.com',
    userName: 'TestUser',
    userPassword: 'password123', // 在实际应用中应使用加密存储
    avatar: 'TU',
    wallet: 100,
    premium: 1,
    verified: true
  },
  {
    id: '2',
    email: 'admin@example.com',
    userName: 'Admin',
    userPassword: 'admin123',
    avatar: 'AD',
    wallet: 500,
    premium: 2,
    verified: true
  }
]



// 模拟产品数据库
const localPickersDatabase = [
  {
    id: '1',
    name: 'Data Processing Tool',
    description: 'ETL tool. Transform, validate and load data with ease.',
    category: 'Tools' as const,
    developer: 'DataTeam Inc.',
    rating: { score: 4.5, count: 128 },
    installs: 3450,
    actionText: 'Get'
  },
  {
    id: '2',
    name: 'Server Monitoring',
    description: 'Real-time server monitoring with alerts and detailed performance metrics.',
    category: 'Popular' as const,
    developer: 'ServerPro Systems',
    rating: { score: 4.8, count: 312 },
    installs: 8250,
    actionText: 'Get'
  },
  {
    id: '3',
    name: 'API Integration Helper',
    description: 'Simplify API integrations with built-in connectors and templates for popular services.',
    category: 'Tools' as const,
    developer: 'DevToolkit Labs',
    rating: { score: 4.2, count: 89 },
    installs: 1875,
    actionText: 'Get'
  },
  {
    id: '4',
    name: 'Backup System Plugin',
    description: 'Automated backup solution with encryption, versioning, and easy restore functionality.',
    category: 'New' as const,
    developer: 'SecureData Systems',
    rating: { score: 4.7, count: 56 },
    installs: 2140,
    actionText: 'Get'
  },
  {
    id: '5',
    name: 'File Conversion Service',
    description: 'Convert between document formats with high-quality output and batch processing capabilities.',
    category: 'Tools' as const,
    developer: 'FileTools Inc.',

    rating: { score: 4.3, count: 147 },
    installs: 4320,
    actionText: 'Get'
  },
  {
    id: '6',
    name: 'AI Assistant Worker',
    description: 'AI-powered assistant for task automation, data analysis and intelligent recommendations.',
    category: 'Premium' as const,
    developer: 'Alnova Tech',
    rating: { score: 4.6, count: 203 },
    installs: 6790,
    actionText: 'Get'
  }
]

// 模拟用户活动数据库
type UserActivities = Array<{
  id: string;
  type: 'installation' | 'purchase' | 'usage' | 'contribution';
  title: string;
  description: string;
  timestamp: string;
}>;

const localActivitiesDatabase: Record<string, UserActivities> = {
  '1': [
    {
      id: '1',
      type: 'installation' as const,
      title: 'Installed Server Monitoring',
      description: 'Tool Server Monitoring',
      timestamp: '2024-05-01 01:32 AM'
    },
    {
      id: '2',
      type: 'purchase' as const,
      title: 'Purchased Premium Plan',
      description: 'Subscription',
      timestamp: '2024-04-28 2:45 PM'
    },
    {
      id: '3',
      type: 'usage' as const,
      title: 'Used API Integration Helper',
      description: 'Tool',
      timestamp: '2024-04-27 11:20 AM'
    },
    {
      id: '4',
      type: 'contribution' as const,
      title: 'Submitted feedback for Data Processing Tool',
      description: 'Community',
      timestamp: '2024-04-25 4:12 PM'
    }
  ],
  '2': [
    {
      id: '5',
      type: 'installation' as const,
      title: 'Installed Admin Dashboard',
      description: 'Admin Tool',
      timestamp: '2024-04-30 10:15 AM'
    },
    {
      id: '6',
      type: 'usage' as const,
      title: 'Generated System Report',
      description: 'Admin Function',
      timestamp: '2024-04-29 3:30 PM'
    }
  ]
}

// 模拟已安装工具数据库
type InstalledTools = Array<{
  id: string;
  name: string;
  type: 'performance' | 'security' | 'administration';
  installedDate: string;
}>;

const localInstalledToolsDatabase: Record<string, InstalledTools> = {
  '1': [
    {
      id: '1',
      name: 'Server Monitoring',
      type: 'performance' as const,
      installedDate: '2024-04-01'
    },
    {
      id: '2',
      name: 'Backup System Plugin',
      type: 'security' as const,
      installedDate: '2024-04-22'
    }
  ],
  '2': [
    {
      id: '3',
      name: 'Admin Dashboard',
      type: 'administration' as const,
      installedDate: '2024-03-15'
    }
  ]
}

// // 模拟验证码存储
// const verificationCodes: Record<string, string> = {}

// // 生成随机验证码
// const generateVerificationCode = (): string => {
//   return Math.floor(100000 + Math.random() * 900000).toString()
// }

// API 服务类
class APIService {
  // 用户认证相关接口, 登录, 注册, 注销, 验证 Done
  async login(email: string, userPassword: string): Promise<UserSystemInfoResponse> {
    await delay(200)
    try {
      // 调用 Tauri 后端的 login 命令
      const responseUserInfo = await invoke<UserSystemInfoResponse>('login', {
        email, // 假设的测试邮箱
        userPassword // 假设的测试密码
      });

      if (!responseUserInfo) {
        throw new Error('User not found.')
      }

      return responseUserInfo;

    } catch (error) {
      // throw new Error(error instanceof Error ? error.message : 'Please try again.');
      const errorMessage = error instanceof Error ? 
        (error.message || 'Login failed.') : 
        (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
      throw new Error(errorMessage);
    }
  }

  async logout(): Promise<unknown> {
    try {
      // 调用 Tauri 后端的 logout 命令
      const message = await invoke('logout');
      
      return message;
    } catch (error) {
      const errorMessage = error instanceof Error ? 
        (error.message || 'Logout failed.') : 
        (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
      throw new Error(errorMessage);
    }
  }

  // 检查登录状态
  async checkLoginStatus(): Promise<boolean> {
    try {
      // 调用 Tauri 后端的 check_login_status 命令
      const isLoggedIn = await invoke<boolean>('check_login_status');
      return isLoggedIn;
    } catch (error) {
      const errorMessage = error instanceof Error ? 
        (error.message || 'Check login status failed.') : 
        (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
      throw new Error(errorMessage);
    }
  }

  // 检查是否为开发用户
  async checkDevUserStatus(): Promise<boolean> {
    try {
      const responseUserInfo = await this.getUserLastestInfo()
      const isDevUser = responseUserInfo.user_type === 'dev'
      return isDevUser;
    } catch (error) {
      const errorMessage = error instanceof Error ? 
        (error.message || 'Check dev user status failed.') : 
        (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
      throw new Error(errorMessage);
    }
  }

  // 检查服务器连接状态
  async checkServerConnection(): Promise<ConnectionStatus> {
    try {
      // 调用 Tauri 后端的 api_connection 命令
      const connectionStatus = await invoke<ConnectionStatus>('api_connection');
      return connectionStatus;
    } catch (error) {
      const errorMessage = error instanceof Error ? 
        (error.message || 'Check server connection failed.') : 
        (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
      throw new Error(errorMessage);
    }
  }
  
  async register(email: string, userName: string, userPassword: string, userType: string): Promise<unknown> {
    await delay(200)

    try {
      // 调用 Tauri 后端的 register 命令
      const response = await invoke<RegisterResponse>('register', {
        email,
        userPassword,
        userName,
        userType
      });

      // // 转换响应格式以保持与原有接口兼容
      // const registerData = {
      //   user_id: response.user_id,
      //   message: response.message,
      // };
      
      return response.message;
    } catch (error) {
      // throw new Error(error instanceof Error ? error.message : 'Please try again.');
      const errorMessage = error instanceof Error ? 
        (error.message || 'Registration failed.') : 
        (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
      throw new Error(errorMessage);
    }
  }
  
  async verifyEmail(email: string, code: string): Promise<unknown> {
    await delay(700)

    try {
      // 调用 Tauri 后端的 verify_email 命令
      await invoke('verify_email', {
        email,
        code
      });
      
      return 'Email verified successfully!';
    } catch (error) {
      const errorMessage = error instanceof Error ? 
        (error.message || 'Email verification failed.') : 
        (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
      throw new Error(errorMessage);
    }
  }

  // 用户资料相关接口
  async getCurrentUserInfo(): Promise<UserInfo> {
    await delay(500)

    try {
      // 调用 Tauri 后端的 get_current_user_info 命令
      const responseUserInfo = await invoke<UserInfo>('get_current_user_info');

      if (!responseUserInfo) {
        throw new Error('User not found')
      }
      
      return responseUserInfo;
    } catch (error) {
      const errorMessage = error instanceof Error ? 
        (error.message || 'Get user profile failed.') : 
        (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
      throw new Error(errorMessage);
    }
  }

  async getUserLastestInfo(): Promise<UserInfo> {
    await delay(500)

    try {
      // 调用 Tauri 后端的 get_user_lastest_info 命令
      const responseUserInfo = await invoke<UserInfo>('get_user_lastest_info');

      if (!responseUserInfo) {
        throw new Error('User not found')
      }

      return responseUserInfo
    } catch (error) {
      const errorMessage = error instanceof Error ? 
        (error.message || 'Get user lastest info failed.') : 
        (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
      throw new Error(errorMessage);
    }
  }

  async getSystemInfo(): Promise<SystemInfo> {
    await delay(500)

    try {
      // 调用 Tauri 后端的 get_system_info 命令
      const responseSystemInfo = await invoke<SystemInfo>('get_system_info');

      if (!responseSystemInfo) {
        throw new Error('System info not found')
      }
      
      return responseSystemInfo;
    } catch (error) {
      const errorMessage = error instanceof Error ? 
        (error.message || 'Get system info failed.') : 
        (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
      throw new Error(errorMessage);
    }
  }
  
  async getUserActivities(userId: string): Promise<unknown> {
    await delay(600)
    
    const activities = localActivitiesDatabase[userId] || []
    
    return { activities }
  }
  
  async getInstalledTools(userId: string): Promise<unknown> {
    await delay(500)
    
    const tools = localInstalledToolsDatabase[userId] || []
    
    return { tools }
  }
  
  async getProfileStats(userId: string): Promise<unknown> {
    await delay(400)
    
    // 计算用户的统计数据
    const toolsUsed = (localInstalledToolsDatabase[userId] || []).length
    
    return {
      stats: {
        toolsUsed,
        contributions: 0, // 简化示例
        tasksCompleted: 0, // 简化示例
        monthsActive: 8,
        storageUsed: 1.2,
        storageTotal: 5,
        walletBalance: localUsers.find(u => u.id === userId)?.wallet || 0,
        premiumCredits: localUsers.find(u => u.id === userId)?.premium || 0
      }
    }
  }

  // Home 相关的接口
  async getLocalPickers(category?: string, search?: string): Promise<unknown> {
    await delay(600)
    
    let filteredLocalPickers = [...localPickersDatabase]
    
    // 按分类筛选
    if (category && category !== 'All') {
      filteredLocalPickers = filteredLocalPickers.filter(p => p.category === category)
    }
    
    // 按搜索关键词筛选
    if (search) {
      const searchLower = search.toLowerCase()
      filteredLocalPickers = filteredLocalPickers.filter(p => 
        p.name.toLowerCase().includes(searchLower) || 
        p.description.toLowerCase().includes(searchLower)
      )
    }
    
    return { 
      pickers: filteredLocalPickers,
      total: filteredLocalPickers.length,
      categories: ['All', ...Array.from(new Set(localPickersDatabase.map(p => p.category)))]
    }
  }
  
  async getLocalPickerDetails(pickerId: string): Promise<unknown> {
    await delay(400)
    
    const picker = localPickersDatabase.find(p => p.id === pickerId)
    
    if (!picker) {
      throw new Error('Picker not found')
    }
    
    return picker;
  }



  // 上传本地 Picker，仅 Dev权限
  async uploadLocalPicker(alias: string, description: string, version: string, price: number, file: File, image?: File): Promise<unknown> {
    await delay(800)

    try {
      // 读取文件内容为ArrayBuffer，然后转换为Uint8Array以匹配后端的Vec<u8>类型
      const fileArrayBuffer = await file.arrayBuffer();
      const fileUint8Array = new Uint8Array(fileArrayBuffer);
      
      // 处理可选的图片文件
      let imageUint8Array: Uint8Array | null = null;
      if (image) {
        const imageArrayBuffer = await image.arrayBuffer();
        imageUint8Array = new Uint8Array(imageArrayBuffer);
      }
      
      // 确保price是整数类型，匹配后端的i64
      const priceAsInteger = Math.floor(price);
      
      // 按照Tauri后端要求，使用对象形式传递参数，确保包含正确的键名
      await invoke<string>('upload_picker', {
        alias,
        description,
        version,
        price: priceAsInteger,
        file: fileUint8Array,
        image: imageUint8Array ? Array.from(imageUint8Array) : null
      });

      return 'Upload Picker success.';
    } catch (error) {
      const errorMessage = error instanceof Error ? 
        (error.message || 'Upload Picker failed.') : 
        (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
      throw new Error(errorMessage);
    }
  }

  // 市场 Pickers 相关接口
  async getPickerMarketplace(page?: string, size?: string, keyword?: string): Promise<PickerListResponse> {
    await delay(500)
    
    try {
      // 调用 Tauri 后端的 get_picker_marketplace 命令
      const pickerListResponse = await invoke<PickerListResponse>('get_picker_marketplace', {
        page,
        size,
        keyword,
      });

      if (!pickerListResponse) {
        throw new Error('Picker list not found')
      }

      return pickerListResponse
    } catch (error) {
      // throw new Error(error instanceof Error ? error.message : 'Please try again.');
      const errorMessage = error instanceof Error ? 
        (error.message || 'Get Picker Marketplace failed.') : 
        (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
      throw new Error(errorMessage);
    }
  }

  async getPickerDetails(pickerId: string): Promise<unknown> {
    await delay(500)
    
    try {
      // 调用 Tauri 后端的 get_picker_detail 命令
      const response = await invoke<string>('get_picker_detail', {
        pickerId,
      });

      if (!response) {
        throw new Error('Picker not found')
      }

      return response
    } catch (error) {
      // throw new Error(error instanceof Error ? error.message : 'Please try again.');
      const errorMessage = error instanceof Error ? 
        (error.message || 'Get Picker Detail failed.') : 
        (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
      throw new Error(errorMessage);
    }
  }

  // 删除 picker
  async deletePicker(pickerId: string): Promise<string> {
    await delay(800)

    try {
      // 调用 Tauri 后端的 delete_picker 命令
      const deletePickerResponse = await invoke<string>('delete_picker', {
        pickerId,
      });

      // 后端返回的响应可能是一个确认消息，我们直接返回
      return deletePickerResponse || 'Picker deleted successfully';
    } catch (error) {
      const errorMessage = error instanceof Error ? 
        (error.message || 'Delete Picker failed.') : 
        (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
      throw new Error(errorMessage);
    }
  }

  // Picker 订单相关的接口
  async createOrder(pickerid: string, paytype: string): Promise<CreateOrderResponse> {
    await delay(800)

    try {
      // 调用 Tauri 后端的 create_order 命令
      const createOrderResponse = await invoke<CreateOrderResponse>('create_order', {
        pickerId: pickerid,
        payType: paytype,
      });

      if (!createOrderResponse || !createOrderResponse.token) {
        throw new Error('Create Order failed.')
      }
      // "Order created successfully, Never close the client and wait for execution to complete!"
      return createOrderResponse;
    } catch (error) {
      const errorMessage = error instanceof Error ? 
        (error.message || 'Create Order failed.') : 
        (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
      throw new Error(errorMessage);
    }
  }

  async getUserOrders(page?: number, size?: number, status?: OrderStatus): Promise<unknown> {
    await delay(500)
    
    try {
      // 调用 Tauri 后端的 get_user_orders 命令
      const userOrderList = await invoke<OrderListResponse>('get_user_orders', {
        page,
        size,
        status,
      });

      if (!userOrderList) {
        throw new Error('Get User Order failed.')
      }

      return userOrderList;
    } catch (error) {
      const errorMessage = error instanceof Error ? 
        (error.message || 'Create Order List failed.') : 
        (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
      throw new Error(errorMessage);
    }
  }

  async getOrderDetails(orderId: string): Promise<unknown> {
    await delay(500)
    
    try {
      // 调用 Tauri 后端的 get_order_detail 命令
      const orderDetail = await invoke<OrderInfo>('get_order_detail', {
        order_id: orderId,
      });

      if (!orderDetail) {
        throw new Error('Get User Order Detail failed.')
      }

      return orderDetail;
    } catch (error) {
      const errorMessage = error instanceof Error ? 
        (error.message || 'Get Order Detail failed.') : 
        (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
      throw new Error(errorMessage);
    }
  }

  async downloadFile(token: string): Promise<string> {
    await delay(100)
    try {
      // 调用 Tauri 后端的 download_picker 命令
      const fileLocalPath = await invoke<string>('download_picker', {
        token: token,
      });

      if (!fileLocalPath) {
        throw new Error('Download Picker failed.')
      }

      return fileLocalPath;
    } catch (error) {
      const errorMessage = error instanceof Error ? 
        (error.message || 'Download Picker failed.') : 
        (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
      throw new Error(errorMessage);
    }
  }

  async getWalletBalance(address: string, chain_url: string): Promise<number> {
    await delay(500)
    try {
      // 调用 Tauri 后端的 get_wallet_balance 命令
      const walletBalance = await invoke<number>('get_wallet_balance', {
        address,
        chainUrl: chain_url,
      });

      if (walletBalance === undefined) {
        throw new Error('Get Wallet Balance failed.')
      }

      // 将余额从 wei 转换为 ether
      const balanceInEther = Number(walletBalance);
      return balanceInEther;
    } catch (error) {
      const errorMessage = error instanceof Error ? 
        (error.message || 'Get Wallet Balance failed.') : 
        (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
      throw new Error(errorMessage);
    }
  }


  // 获取最大可转账余额
  async getMaxTransferableBalance(address: string, chain_url: string): Promise<number> {
    await delay(500)
    try {
      // 调用 Tauri 后端的 get_max_transferable_balance 命令
      const maxTransferableBalance = await invoke<number>('get_max_transferable_balance', {
        address,
        chainUrl: chain_url,
      });

      if (maxTransferableBalance === undefined) {
        throw new Error('Get Max Transferable Balance failed.')
      }

      // 将余额从 wei 转换为 ether
      const balanceInEther = Number(maxTransferableBalance);
      return balanceInEther;
    } catch (error) {
      const errorMessage = error instanceof Error ? 
        (error.message || 'Get Max Transferable Balance failed.') : 
        (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
      throw new Error(errorMessage);
    }
  }


  // 转账到指定地址
  async transferTo(to_address: string, amount: string): Promise<TransferToResponse> {
    try {
      const convertAmount = Number(amount) * 1e18;
      const request: TransferToRequest = { toAddress: to_address, amount: convertAmount.toString() };
      const response = await invoke<TransferToResponse>('transfer_to', request as Record<string, string>);
      return response;
    } catch (error) {
        const errorMessage = error instanceof Error ? 
          (error.message || 'Failed to transfer to address.') : 
          (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
        throw new Error(errorMessage);
    }
  }

  // 替换用户私钥 replace_private_key
  async replacePrivateKey(request: ReplacePrivateKeyRequest): Promise<ReplacePrivateKeyResponse> {
    try {
      const response = await invoke<ReplacePrivateKeyResponse>('replace_private_key', request as Record<string, string>);
      return response;
    } catch (error) {
        const errorMessage = error instanceof Error ? 
          (error.message || 'Failed to replace private key.') : 
          (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
        throw new Error(errorMessage);
    }
  }

}
// 导出单例实例
export const clientAPI = new APIService()

export default clientAPI
