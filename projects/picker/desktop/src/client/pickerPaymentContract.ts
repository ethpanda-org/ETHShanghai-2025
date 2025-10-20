// 区块链支付合约接口
// 提供与 Tauri 后端区块链支付合约通信的接口
import { invoke } from '@tauri-apps/api/core';

// 请求和响应模型定义

export interface IsOperatorQuery {
  address: string;
  [key: string]: unknown;
}

export interface IsOperatorResponse {
  is_operator: boolean;
  [key: string]: unknown;
}

export interface QueryPickerByWalletQuery {
  wallet: string;
  [key: string]: unknown;
}

export interface QueryPickerByWalletResponse {
  picker_id: string | null;
  dev_user_id: string | null;
  [key: string]: unknown;
}

export interface RegisterPickerRequest {
  pickerId: string;
  devUserId: string;
  devWalletAddress: string;
  [key: string]: unknown;
}

export interface RegisterPickerResponse {
  success: boolean;
  tx_hash: string;
  [key: string]: unknown;
}

export interface RemovePickerRequest {
  pickerId: string;
  [key: string]: unknown;
}

export interface RemovePickerResponse {
  success: boolean;
  tx_hash: string;
  [key: string]: unknown;
}

export interface BlockchainPickerInfo {
  picker_id: string;
  dev_user_id: string;
  dev_wallet_address: string;
  [key: string]: unknown;
}

export interface GetAllPickersResponse {
  pickers: BlockchainPickerInfo[];
  [key: string]: unknown;
}

export interface GrantOperatorRoleRequest {
  operatorAddress: string;
  [key: string]: unknown;
}

export interface GrantOperatorRoleResponse {
  success: boolean;
  tx_hash: string;
  [key: string]: unknown;
}

export interface GetAllOperatorsResponse {
  operators: string[];
  [key: string]: unknown;
}

export interface RevokeOperatorRoleRequest {
  operatorAddress: string;
  [key: string]: unknown;
}

export interface RevokeOperatorRoleResponse {
  success: boolean;
  tx_hash: string;
  [key: string]: unknown;
}

export interface WithdrawFundsRequest {
  recipientAddress: string;
  [key: string]: unknown;
}

export interface WithdrawFundsResponse {
  success: boolean;
  tx_hash: string;
  [key: string]: unknown;
}

// 区块链支付合约接口函数
// 检查地址是否为操作员
export async function isPickerOperator(address: string): Promise<IsOperatorResponse> {
  try {
    console.log('Frontend API: Calling Tauri command is_picker_operator with address:', address);
    const response = await invoke<IsOperatorResponse>('is_picker_operator', { address });
    console.log('Frontend API: Received response from Tauri command:', response);
    return response;
  } catch (error) {
    console.error('Frontend API: Error in isPickerOperator:', error);
    const errorMessage = error instanceof Error ? 
      (error.message || 'Failed to check if address is operator.') : 
      (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
    throw new Error(errorMessage);
  }
}

// 通过钱包地址查询 Picker
export async function queryPickerByWallet(wallet: string): Promise<QueryPickerByWalletResponse> {
  try {
    console.log('Frontend API: Calling Tauri command query_picker_by_wallet with wallet:', wallet);
    const response = await invoke<QueryPickerByWalletResponse>('query_picker_by_wallet', { wallet });
    console.log('Frontend API: Received response from Tauri command:', response);
    return response;
  } catch (error) {
    console.error('Frontend API: Error in queryPickerByWallet:', error);
    const errorMessage = error instanceof Error ? 
      (error.message || 'Failed to query picker by wallet.') : 
      (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
    throw new Error(errorMessage);
  }
}

// 注册新的 Picker
export async function registerPicker(
  picker_id: string,
  dev_user_id: string,
  dev_wallet_address: string
): Promise<RegisterPickerResponse> {
  try {
    const request: RegisterPickerRequest = {
      pickerId: picker_id,
      devUserId: dev_user_id,
      devWalletAddress: dev_wallet_address
    };
    
    console.log('Frontend API: Calling Tauri command register_picker with request:', request);
    const response = await invoke<RegisterPickerResponse>('register_picker', request as Record<string, unknown>);
    console.log('Frontend API: Received response from Tauri command:', response);
    return response;
  } catch (error) {
    console.error('Frontend API: Error in registerPicker:', error);
    const errorMessage = error instanceof Error ? 
      (error.message || 'Failed to register picker.') : 
      (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
    throw new Error(errorMessage);
  }
}

// 移除 Picker
export async function removePicker(picker_id: string): Promise<RemovePickerResponse> {
  try {
    const request: RemovePickerRequest = { pickerId: picker_id };
    console.log('Frontend API: Calling Tauri command remove_picker with request:', request);
    const response = await invoke<RemovePickerResponse>('remove_picker', request as Record<string, unknown>);
    console.log('Frontend API: Received response from Tauri command:', response);
    return response;
  } catch (error) {
    console.error('Frontend API: Error in removePicker:', error);
    const errorMessage = error instanceof Error ? 
      (error.message || 'Failed to remove picker.') : 
      (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
    throw new Error(errorMessage);
  }
}

// 获取所有 Pickers
export async function getAllPickers(): Promise<GetAllPickersResponse> {
  try {
    const response = await invoke<GetAllPickersResponse>('get_all_pickers');
    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? 
      (error.message || 'Failed to get all pickers.') : 
      (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
    throw new Error(errorMessage);
  }
}

// 获取所有操作员
export async function getAllOperators(): Promise<GetAllOperatorsResponse> {
  try {
    const response = await invoke<GetAllOperatorsResponse>('get_all_operators');
    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? 
      (error.message || 'Failed to get all operators.') : 
      (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
    throw new Error(errorMessage);
  }
}

// 授予操作员角色
export async function grantOperatorRole(operator_address: string): Promise<GrantOperatorRoleResponse> {
  try {
    const request: GrantOperatorRoleRequest = { operatorAddress: operator_address };
    console.log('Frontend API: Calling Tauri command grant_operator_role with request:', request);
    const response = await invoke<GrantOperatorRoleResponse>('grant_operator_role', request as Record<string, unknown>);
    console.log('Frontend API: Received response from Tauri command:', response);
    return response;
  } catch (error) {
    console.error('Frontend API: Error in grantOperatorRole:', error);
    const errorMessage = error instanceof Error ? 
      (error.message || 'Failed to grant operator role.') : 
      (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
    throw new Error(errorMessage);
  }
}

// 撤销操作员角色
export async function revokeOperatorRole(operator_address: string): Promise<RevokeOperatorRoleResponse> {
  try {
    const request: RevokeOperatorRoleRequest = { operatorAddress: operator_address };
    console.log('Frontend API: Calling Tauri command revoke_operator_role with request:', request);
    const response = await invoke<RevokeOperatorRoleResponse>('revoke_operator_role', request as Record<string, unknown>);
    console.log('Frontend API: Received response from Tauri command:', response);
    return response;
  } catch (error) {
    console.error('Frontend API: Error in revokeOperatorRole:', error);
    const errorMessage = error instanceof Error ? 
      (error.message || 'Failed to revoke operator role.') : 
      (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
    throw new Error(errorMessage);
  }
}

// 提取资金
export async function withdrawFunds(recipient_address: string): Promise<WithdrawFundsResponse> {
  try {
    const request: WithdrawFundsRequest = { recipientAddress: recipient_address };
    const response = await invoke<WithdrawFundsResponse>('withdraw_funds', request as Record<string, unknown>);
    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? 
      (error.message || 'Failed to withdraw funds.') : 
      (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
    throw new Error(errorMessage);
  }
}

