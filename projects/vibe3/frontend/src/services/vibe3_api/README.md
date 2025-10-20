# Vibe3 API 客户端

这是一个类型安全的API客户端，用于与Vibe3后端服务进行交互。

## 功能特性

- ✅ 完整的TypeScript类型支持
- ✅ 统一的错误处理
- ✅ 自动token管理
- ✅ 函数式API设计
- ✅ 支持环境变量配置

## 安装和配置

### 1. 环境变量配置

在项目根目录创建 `.env.local` 文件：

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8787
```

### 2. 导入API函数

```typescript
import { 
  register, 
  login, 
  getCurrentUser, 
  logout, 
  isAuthenticated,
  healthCheck,
  getApiInfo,
  ApiException 
} from '@/services/vibe3_api';
```

## 使用方法

### 直接使用函数

```typescript
import { 
  register, 
  login, 
  getCurrentUser, 
  logout, 
  isAuthenticated 
} from '@/services/vibe3_api';

// 用户注册
const registerResult = await register('user@example.com', 'password123');

// 用户登录
const loginResult = await login('user@example.com', 'password123');

// 获取当前用户信息
const userInfo = await getCurrentUser();

// 检查登录状态
const loggedIn = isAuthenticated();

// 用户登出
logout();
```

### 使用便捷API对象

```typescript
import { authApi, vibe3Api } from '@/services/vibe3_api';

// 认证相关
const registerResult = await authApi.register('user@example.com', 'password123');
const loginResult = await authApi.login('user@example.com', 'password123');
const userInfo = await authApi.getCurrentUser();
const loggedIn = authApi.isAuthenticated();
authApi.logout();

// 系统相关
const health = await vibe3Api.healthCheck();
const apiInfo = await vibe3Api.getApiInfo();
```

## API 函数

### 认证相关函数

#### 1. `register(email, password)`
- **功能**: 用户注册
- **参数**: 
  - `email`: 用户邮箱
  - `password`: 用户密码（至少6位）
- **返回**: `Promise<RegisterResponse>`

#### 2. `login(email, password)`
- **功能**: 用户登录
- **参数**:
  - `email`: 用户邮箱
  - `password`: 用户密码
- **返回**: `Promise<LoginResponse>`
- **注意**: 登录成功后自动保存token

#### 3. `getCurrentUser()`
- **功能**: 获取当前用户信息
- **需要**: 有效的JWT token
- **返回**: `Promise<UserInfoResponse>`

#### 4. `logout()`
- **功能**: 用户登出
- **作用**: 清除本地存储的token

#### 5. `isAuthenticated()`
- **功能**: 检查登录状态
- **返回**: `boolean`

### 系统相关函数

#### 1. `healthCheck()`
- **功能**: 健康检查
- **返回**: `Promise<{ status: string }>`

#### 2. `getApiInfo()`
- **功能**: 获取API信息
- **返回**: `Promise<unknown>`

## 错误处理

API客户端使用自定义的 `ApiException` 类来处理错误：

```typescript
import { ApiException } from '@/services/vibe3_api';

try {
  const result = await login('user@example.com', 'wrongpassword');
} catch (error) {
  if (error instanceof ApiException) {
    console.error('API错误:', {
      status: error.status,    // HTTP状态码
      message: error.message,  // 错误消息
      data: error.data         // 错误详情
    });
  } else {
    console.error('未知错误:', error);
  }
}
```

### 错误码处理示例

```typescript
try {
  await login('user@example.com', 'wrongpassword');
} catch (error) {
  if (error instanceof ApiException) {
    switch (error.status) {
      case 400:
        console.error('请求参数错误:', error.message);
        break;
      case 401:
        console.error('认证失败:', error.message);
        break;
      case 409:
        console.error('资源冲突:', error.message);
        break;
      case 500:
        console.error('服务器错误:', error.message);
        break;
      default:
        console.error('未知错误:', error.message);
    }
  }
}
```

## 错误码说明

- `400`: 请求参数错误
- `401`: 未授权或认证失败
- `409`: 资源冲突（如邮箱已存在）
- `500`: 服务器内部错误

## 类型定义

```typescript
// 用户资料
interface Profile {
  id: string;
  email: string;
  avatar?: string;
  bio?: string;
  nickname?: string;
}

// 注册请求
interface RegisterRequest {
  email: string;
  password: string;
}

// 登录请求
interface LoginRequest {
  email: string;
  password: string;
}

// 注册响应
interface RegisterResponse {
  success: boolean;
  message: string;
  data: {
    userId: string;
    email: string;
    id: string;
    token: string;
  };
}

// 登录响应
interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    email: string;
    avatar?: string;
    bio?: string;
    nickname?: string;
    created_at: string;
    updated_at: string;
    token: string;
  };
}

// 用户信息响应
interface UserInfoResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    email: string;
    avatar?: string;
    bio?: string;
    nickname?: string;
  };
}
```

## 完整示例

查看 `example.ts` 文件获取完整的使用示例。

## Token 管理

API客户端内部管理token，你不需要手动处理：

```typescript
// 登录后自动保存token
await login('user@example.com', 'password123');

// 后续请求自动使用保存的token
const userInfo = await getCurrentUser();

// 登出时自动清除token
logout();
```

## 注意事项

1. **Token管理**: 登录成功后，token会自动保存，无需手动管理
2. **环境变量**: 确保正确配置 `NEXT_PUBLIC_API_BASE_URL` 环境变量
3. **错误处理**: 始终使用 try-catch 包装API调用
4. **类型安全**: 所有API调用都有完整的TypeScript类型支持
5. **函数式设计**: 每个API都是独立的函数，易于测试和使用
