# Tauri API 调用文档

## 概述
本文档详细介绍了如何在 React TypeScript 前端应用中调用 Tauri 后端 API。

## 基本调用方法

在 React TypeScript 中调用 Tauri API 需要使用 `@tauri-apps/api` 包中的 `invoke` 函数。首先需要导入相关模块：

```typescript
import { invoke } from '@tauri-apps/api'
```

然后可以使用 `invoke` 函数调用后端暴露的命令：

```typescript
// 基本调用格式
try {
  const result = await invoke('command_name', {
    // 参数列表
    param1: value1,
    param2: value2
  })
  // 处理成功结果
} catch (error) {
  // 处理错误
  console.error('API调用失败:', error)
}
```

## 用户相关 API

### 1. 登录 (login)

**功能**: 用户登录认证

**参数**:
- `email`: 字符串，用户邮箱
- `user_password`: 字符串，用户密码

**返回值**:
- 登录成功时返回 `LoginResponse` 对象，包含 token 和用户信息

**示例**:

```typescript
import { invoke } from '@tauri-apps/api'

interface LoginResponse {
  token: string
  user: {
    user_id: string
    email: string
    user_name: string
    user_type: string
    wallet_address: string
    premium_balance: number
    created_at: string
  }
}

async function login(email: string, user_password: string): Promise<LoginResponse> {
  try {
    const response = await invoke<LoginResponse>('login', {
      email,
      user_password
    })
    return response
  } catch (error) {
    throw new Error(`登录失败: ${error}`)
  }
}
```

### 2. 注册 (register)

**功能**: 用户注册新账号

**参数**:
- `email`: 字符串，用户邮箱
- `user_password`: 字符串，用户密码
- `user_name`: 字符串，用户名
- `user_type`: 字符串，用户类型（'gen' 或 'dev'）

**返回值**:
- 注册成功时返回空值

**示例**:

```typescript
async function register(
  email: string,
  userPassword: string,
  userName: string,
  userType: string,
): Promise<void> {
  try {
    await invoke('register', {
      email,
      userPassword,
      userName,
      userType,
    })
  } catch (error) {
    throw new Error(`注册失败: ${error}`)
  }
}
```

### 3. 邮箱验证 (verify_email)

**功能**: 验证用户邮箱

**参数**:
- `email`: 字符串，需要验证的邮箱
- `code`: 字符串，验证码

**返回值**:
- 验证成功时返回空值

**示例**:

```typescript
async function verifyEmail(email: string, code: string): Promise<void> {
  try {
    await invoke('verify_email', {
      email,
      code
    })
  } catch (error) {
    throw new Error(`邮箱验证失败: ${error}`)
  }
}
```

### 4. 获取用户资料 (get_user_lastest_info)

**功能**: 获取当前登录用户的详细资料

**参数**: 无

**注意**: 此命令需要用户登录认证

**返回值**:
- 返回 `UserInfo` 对象，包含用户详细信息

**示例**:

```typescript
interface UserInfo {
  user_id: string
  email: string
  user_name: string
  user_type: string
  wallet_address: string
  premium_balance: number
  created_at: string
}

async function getUserProfile(): Promise<UserInfo> {
  try {
    const profile = await invoke<UserInfo>('get_user_lastest_info')
    return profile
  } catch (error) {
    throw new Error(`获取用户最新资料失败: ${error}`)
  }
}
```

### 5. 登出 (logout)

**功能**: 用户登出系统

**参数**: 无

**返回值**:
- 登出成功时返回空值

**示例**:

```typescript
async function logout(): Promise<void> {
  try {
    await invoke('logout')
  } catch (error) {
    throw new Error(`登出失败: ${error}`)
  }
}
```

### 6. 检查登录状态 (check_login_status)

**功能**: 检查用户是否已登录

**参数**: 无

**返回值**:
- 已登录返回 `true`，未登录返回 `false`

**示例**:

```typescript
async function checkLoginStatus(): Promise<boolean> {
  try {
    const isLoggedIn = await invoke<boolean>('check_login_status')
    return isLoggedIn
  } catch (error) {
    console.error('检查登录状态失败:', error)
    return false
  }
}
```

### 7. 获取当前用户信息 (get_current_user_info)

**功能**: 获取本地存储的当前用户信息

**参数**: 无

**返回值**:
- 返回用户信息对象或 `null`（如果未登录）

**示例**:

```typescript
async function getCurrentUserInfo(): Promise<any | null> {
  try {
    const userInfo = await invoke<any | null>('get_current_user_info')
    return userInfo
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return null
  }
}
```

## Picker 相关 API

### 1. 获取 Picker 市场列表 (get_picker_marketplace)

**功能**: 获取市场上可用的 Picker 列表

**参数**:
- `page`: 可选，数字，分页页码
- `size`: 可选，数字，每页条数
- `keyword`: 可选，字符串，搜索关键词

**返回值**:
- 返回 `PickerListResponse` 对象，包含 Picker 列表和总数

**示例**:

```typescript
interface PickerInfo {
  picker_id: string
  alias: string
  description: string
  price: number
  image_path: string
  version: string
  download_count: number
  created_at: string
}

interface PickerListResponse {
  pickers: PickerInfo[]
  total: number
}

async function getPickerMarketplace(
  page?: number,
  size?: number,
  keyword?: string
): Promise<PickerListResponse> {
  try {
    const response = await invoke<PickerListResponse>('get_picker_marketplace', {
      page,
      size,
      keyword
    })
    return response
  } catch (error) {
    throw new Error(`获取 Picker 列表失败: ${error}`)
  }
}
```

### 2. 获取 Picker 详情 (get_picker_detail)

**功能**: 获取指定 Picker 的详细信息

**参数**:
- `picker_id`: 字符串，Picker 的唯一标识符

**返回值**:
- 返回 `PickerInfo` 对象，包含 Picker 详细信息

**示例**:

```typescript
async function getPickerDetail(pickerId: string): Promise<PickerInfo> {
  try {
    const detail = await invoke<PickerInfo>('get_picker_detail', {
      picker_id: pickerId
    })
    return detail
  } catch (error) {
    throw new Error(`获取 Picker 详情失败: ${error}`)
  }
}
```

### 3. 上传新的 Picker (upload_picker)

**功能**: 上传新的 Picker 到市场

**参数**:
- `alias`: 字符串，Picker 的别名
- `description`: 字符串，Picker 的描述
- `version`: 字符串，Picker 的版本号
- `price`: 整数，Picker 的价格（后端使用i64类型）
- `file`: Uint8Array，Picker 文件的二进制数据
- `image`: 可选，Uint8Array，Picker 图片的二进制数据

**注意**: 此命令需要用户登录认证

**返回值**:
- 上传成功时返回空值

**示例**:

```typescript
async function uploadPicker(
  alias: string,
  description: string,
  version: string,
  price: number,
  file: Uint8Array,
  image?: Uint8Array
): Promise<void> {
  try {
    await invoke('upload_picker', {
      alias,
      description,
      version,
      price,
      file,
      image
    })
  } catch (error) {
    throw new Error(`上传 Picker 失败: ${error}`)
  }
}
```

## 订单相关 API

### 1. 获取用户订单列表 (get_user_orders)

**功能**: 获取当前登录用户的订单列表

**参数**:
- `page`: 可选，数字，分页页码
- `size`: 可选，数字，每页条数
- `status`: 可选，字符串，订单状态筛选

**注意**: 此命令需要用户登录认证

**返回值**:
- 返回 `OrderListResponse` 对象，包含订单列表和分页信息

**示例**:

```typescript
interface OrderInfo {
  order_id: string
  user_id: string
  picker_id: string
  picker_alias: string
  amount: number
  pay_type: string
  status: string
  created_at: string
}

interface OrderListResponse {
  orders: OrderInfo[]
  total: number
  page: number
  size: number
  has_next: boolean
}

async function getUserOrders(
  page?: number,
  size?: number,
  status?: string
): Promise<OrderListResponse> {
  try {
    const response = await invoke<OrderListResponse>('get_user_orders', {
      page,
      size,
      status
    })
    return response
  } catch (error) {
    throw new Error(`获取订单列表失败: ${error}`)
  }
}
```

### 2. 创建订单 (create_order)

**功能**: 创建新的订单

**参数**:
- `picker_id`: 字符串，要购买的 Picker 的唯一标识符
- `pay_type`: 字符串，支付类型（'wallet' 或 'premium'）

**注意**: 此命令需要用户登录认证

**返回值**:
- 返回订单创建结果对象，包含订单ID和消息

**示例**:

```typescript
interface CreateOrderResponse {
  order_id: string
  message: string
}

async function createOrder(pickerId: string, payType: string): Promise<CreateOrderResponse> {
  try {
    const order = await invoke<CreateOrderResponse>('create_order', {
      picker_id: pickerId,
      pay_type: payType
    })
    return order
  } catch (error) {
    throw new Error(`创建订单失败: ${error}`)
  }
}
```

### 3. 获取订单详情 (get_order_detail)

**功能**: 获取指定订单的详细信息

**参数**:
- `order_id`: 字符串，订单的唯一标识符

**注意**: 此命令需要用户登录认证

**返回值**:
- 返回 `OrderInfo` 对象，包含订单详细信息

**示例**:

```typescript
async function getOrderDetail(orderId: string): Promise<OrderInfo> {
  try {
    const detail = await invoke<OrderInfo>('get_order_detail', {
      order_id: orderId
    })
    return detail
  } catch (error) {
    throw new Error(`获取订单详情失败: ${error}`)
  }
}
```

## 下载相关 API

### 1. 下载 Picker 文件 (download_picker)

**功能**: 下载指定的 Picker 文件

**参数**:
- `token`: 字符串，下载令牌

**注意**: 此命令内部会自动获取应用实例，前端调用时只需提供token参数

**返回值**:
- 返回字符串，表示下载文件的保存路径

**示例**:

```typescript
async function downloadPicker(token: string): Promise<string> {
  try {
    const filePath = await invoke<string>('download_picker', {
      token
    })
    return filePath
  } catch (error) {
    throw new Error(`下载 Picker 失败: ${error}`)
  }
}```

## 错误处理

Tauri API 调用可能会返回各种错误，建议使用 try-catch 结构进行处理，并根据错误类型提供相应的用户反馈。

```typescript
try {
  // API 调用
} catch (error) {
  // 处理错误
  if (typeof error === 'string') {
    // 字符串类型错误
    console.error('API 错误:', error)
  } else if (error instanceof Error) {
    // Error 对象类型错误
    console.error('API 错误:', error.message)
  } else {
    // 其他类型错误
    console.error('未知错误:', error)
  }
}
```

## 认证机制

Tauri 后端使用 JWT (JSON Web Token) 进行认证，并通过 `AuthManager` 管理认证状态。登录成功后，token 和用户信息会被保存在本地 `auth.json` 文件中，并在后续的 API 调用中自动附加到请求头中。

需要认证的 API 会自动检查用户是否已登录，未登录的情况下会返回认证错误。所有需要认证的 API 在文档中都已明确标注。

## 最佳实践

1. **创建 API 服务类**: 将所有 API 调用封装在一个服务类中，方便管理和复用

```typescript
// 示例: 创建 API 服务类
class ApiService {
  // 用户相关 API
  static async login(email: string, userPassword: string) {
    // 实现登录逻辑
  }
  
  // 其他 API 方法...
}
```

2. **使用 Hooks 管理状态**: 在 React 组件中使用自定义 Hooks 管理 API 调用状态

```typescript
// 示例: 登录状态 Hook
function useLogin() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const login = async (email: string, userPassword: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await ApiService.login(email, userPassword)
      return response
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
      throw err
    } finally {
      setIsLoading(false)
    }
  }
  
  return { login, isLoading, error }
}
```

3. **处理加载状态和错误状态**: 在 UI 中提供清晰的加载状态和错误提示

4. **封装文件上传**: 对于文件上传操作，创建专门的辅助函数处理文件读取和转换

```typescript
// 示例: 文件读取辅助函数
async function readFileAsArrayBuffer(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result))
      } else {
        reject(new Error('无法读取文件'))
      }
    }
    reader.onerror = () => reject(new Error('文件读取错误'))
    reader.readAsArrayBuffer(file)
  })
}
```

5. **全局错误处理**: 设置全局错误处理机制，统一处理常见的 API 错误

## 数据模型参考

### 用户相关

- **UserType**: 'gen' 或 'dev'
- **LoginRequest**: { email, user_password }
- **LoginResponse**: { token, user: UserInfo }
- **RegisterRequest**: { email, user_password, user_name, user_type, wallet_address }
- **VerifyRequest**: { email, code }
- **UserInfo**: { user_id, email, user_name, user_type, wallet_address, premium_balance, created_at }

### Picker 相关

- **PickerInfo**: { picker_id, alias, description, price, image_path, version, download_count, created_at }
- **PickerListResponse**: { pickers, total }
- **UploadPickerRequest**: { alias, description, price, version }

### 订单相关

- **PayType**: 'wallet' 或 'premium'
- **OrderStatus**: 'pending', 'success' 或 'expired'
- **OrderInfo**: { order_id, user_id, picker_id, picker_alias, amount, pay_type, status, created_at }
- **OrderListResponse**: { orders, total, page, size, has_next }
- **CreateOrderRequest**: { picker_id, pay_type }
- **CreateOrderResponse**: { order_id, message }

## 示例应用

下面是一个简单的示例，展示如何在 React 组件中使用这些 API：

```typescriptx
import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api'
import type { PickerInfo } from './types'

function MarketplacePage() {
  const [pickers, setPickers] = useState<PickerInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 加载 Picker 市场数据
    const loadPickers = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await invoke<{ pickers: PickerInfo[], total: number }>('get_picker_marketplace', {
          page: 1,
          size: 10
        })
        
        setPickers(response.pickers)
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载市场数据失败')
      } finally {
        setLoading(false)
      }
    }

    loadPickers()
  }, [])

  const handleDownload = async (pickerId: string) => {
    try {
      // 首先创建订单
      const order = await invoke<{ order_id: string, message: string }>('create_order', {
        picker_id: pickerId,
        pay_type: 'wallet'
      })
      
      // 然后获取订单详情，实际API中需要从订单系统获取下载令牌
      const orderDetail = await invoke<OrderInfo>('get_order_detail', {
        order_id: order.order_id
      })
      
      // 注意：实际应用中，需要从订单系统或其他方式获取有效的下载令牌
      // 此处仅为示例，具体实现需根据实际业务流程调整
      const downloadToken = "sample_download_token";
      
      // 下载 Picker
      const filePath = await invoke<string>('download_picker', {
        token: downloadToken
      })
      
      alert(`Picker 已下载到: ${filePath}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : '下载失败')
    }
  }

  if (loading) return <div>加载中...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="marketplace">
      <h1>Picker 市场</h1>
      <div className="picker-grid">
        {pickers.map(picker => (
          <div key={picker.picker_id} className="picker-card">
            <h3>{picker.alias}</h3>
            <p>{picker.description}</p>
            <div className="picker-meta">
              <span>版本: {picker.version}</span>
              <span>价格: {picker.price}</span>
            </div>
            <button onClick={() => handleDownload(picker.picker_id)}>
              下载
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default MarketplacePage
```

## 总结

本文档详细介绍了如何在 React TypeScript 前端应用中调用 Tauri 后端 API。通过遵循上述指南和最佳实践，您可以有效地利用 Tauri 提供的功能，构建功能丰富的桌面应用。

对于更复杂的应用场景，建议根据项目需求进一步封装和扩展这些 API 调用，以提高代码的可维护性和复用性。