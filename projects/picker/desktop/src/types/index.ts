// 定义API响应的类型
export interface UserInfo {
  user_id: string
  email: string
  user_name: string
  user_type: string
  wallet_address: string
  premium_balance: number
  created_at: string
}


export interface TransferToRequest {
  toAddress: string;
  amount: string;
  [key: string]: unknown;
}

export interface TransferToResponse {
  success: boolean;
  tx_hash_url: string;
  [key: string]: unknown;
}

export interface ReplacePrivateKeyRequest {
  oldWalletAddress: string;
  newPrivateKey: string;
  [key: string]: unknown;
}

export interface ReplacePrivateKeyResponse {
  message: string;
  [key: string]: unknown;
}

// 定义系统信息的类型
export interface SystemInfo {
  chain_name: string,
  chain_url: string,
  explorer_url: string,
  premium_payment_rate: number,
  premium_to_usd: number,
  premium_free: number,
  premium_period: number,
  premium_start: boolean,
}

export interface UserSystemInfoResponse {
  wallet_balance: number,
  user_info: UserInfo,
  system_info: SystemInfo,
}

export interface RegisterResponse {
  user_id: string
  message: string
}

export interface PickerInfo {
  picker_id: string
  dev_user_id: string
  alias: string
  description: string
  price: number
  image_path: string
  version: string
  download_count: number
  created_at: string
  updated_at: string
  status: string
}

export interface PickerListResponse {
  pickers: PickerInfo[]
  total: number
}

export interface CreateOrderResponse {
  token: string
  message: string
}

export interface PayType {
  Wallet: 'wallet'
  Premium: 'premium'
}

export interface OrderStatus {
  Pending: 'pending'
  Success: 'success'
  Expired: 'expired'
}

export interface OrderInfo {
  orderId: string
  userId: string
  pickerId: string
  pickerAlias: string
  amount: number
  payType: PayType
  status: OrderStatus
  createdAt: string
}

export interface OrderListResponse {
  orders: OrderInfo[]
  total: number
  page: number
  size: number
  has_next: boolean
}

export interface Task {
  id: string;
  name: string;
  status: 'running' | 'idle' | 'error';
  installed: string;
  runs: number;
  last_run: string;
  picker_path: string;
}

export type TaskStatus = 'all' | 'running' | 'idle' | 'error';

export interface LogEntry {
  id: string;
  message: string;
  timestamp: string;
  type: 'info' | 'success' | 'error';
}

// Marketplace interfaces
export interface PickerRating {
  score: number;
  count: number;
}

export interface Picker {
  id: string;
  name: string;
  description: string;
  category: string;
  developer: string;
  rating: PickerRating;
  installs: number;
  actionText: string;
  icon?: string;
}

export type Category = 'All' | 'Popular' | 'New';

// Profile interfaces
export interface Activity {
  id: string;
  type: 'installation' | 'purchase' | 'usage' | 'contribution';
  title: string;
  description: string;
  timestamp: string;
}

export interface InstalledTool {
  id: string;
  name: string;
  type: 'performance' | 'security';
  installedDate: string;
}

export interface ProfileStats {
  toolsUsed: number;
  contributions: number;
  tasksCompleted: number;
  monthsActive: number;
  storageUsed: number;
  storageTotal: number;
  walletBalance: number;
  premiumCredits: number;
}

// Chatbot interfaces
export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: string;
  type?: 'text' | 'image' | 'button' | 'form';
  buttons?: ChatButton[];
}

export interface ChatButton {
  id: string;
  text: string;
  action: string;
}

export interface ChatbotSession {
  id: string;
  title: string;
  createdAt: string;
  lastMessage?: string;
}