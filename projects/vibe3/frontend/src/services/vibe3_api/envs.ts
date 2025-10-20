import { authenticatedRequest, tokenManager, ApiException } from "./auth";

export interface EnvItem {
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEnvsRequest {
  kv_pair: Record<string, string>;
}

export interface CreateEnvsResponse {
  success: boolean;
  message: string;
}

export interface GetEnvsResponse {
  success: boolean;
  envs: EnvItem[];
}

export interface DeleteEnvsResponse {
  success: boolean;
  message: string;
  deleted_count?: number;
  deleted_keys?: string[];
}

export interface BatchDeleteEnvsRequest {
  keys: string[];
}

/**
 * 创建或更新环境变量
 * @param appId 应用ID
 * @param kvPair 键值对对象
 * @returns 创建结果
 */
export async function createOrUpdateEnvs(
  appId: string,
  kvPair: Record<string, string>
): Promise<CreateEnvsResponse> {
  const token = tokenManager.getToken();
  if (!token) {
    throw new ApiException(401, "Unauthorized");
  }

  // 验证输入参数
  if (!kvPair || typeof kvPair !== 'object') {
    throw new ApiException(400, "kv_pair is required");
  }

  for (const [key, value] of Object.entries(kvPair)) {
    if (!value || typeof value !== 'string') {
      throw new ApiException(400, `value is required: "${key}"`);
    }
  }

  return authenticatedRequest<CreateEnvsResponse>(
    `/envs/create/${appId}`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ kv_pair: kvPair }),
    }
  );
}

/**
 * 获取应用的环境变量
 * @param appId 应用ID
 * @returns 环境变量列表
 */
export async function getEnvs(appId: string): Promise<EnvItem[]> {
  const token = tokenManager.getToken();
  if (!token) {
    throw new ApiException(401, "Unauthorized");
  }

  const response = await authenticatedRequest<GetEnvsResponse>(
    `/envs/${appId}`,
    token,
    {
      method: "GET",
    }
  );

  return response.envs;
}

/**
 * 批量删除环境变量
 * @param appId 应用ID
 * @param keys 要删除的键数组
 * @returns 删除结果
 */
export async function batchDeleteEnvs(
  appId: string,
  keys: string[]
): Promise<DeleteEnvsResponse> {
  const token = tokenManager.getToken();
  if (!token) {
    throw new ApiException(401, "Unauthorized");
  }

  // 验证输入参数
  if (!keys || !Array.isArray(keys) || keys.length === 0) {
    throw new ApiException(400, "keys array is required and cannot be empty");
  }

  for (const key of keys) {
    if (typeof key !== 'string' || !key.trim()) {
      throw new ApiException(400, "all keys must be non-empty strings");
    }
  }

  return authenticatedRequest<DeleteEnvsResponse>(
    `/envs/${appId}/batch`,
    token,
    {
      method: "DELETE",
      body: JSON.stringify({ keys }),
    }
  );
}

/**
 * 删除单个环境变量
 * @param appId 应用ID
 * @param key 要删除的键
 * @returns 删除结果
 */
export async function deleteEnv(
  appId: string,
  key: string
): Promise<DeleteEnvsResponse> {
  const token = tokenManager.getToken();
  if (!token) {
    throw new ApiException(401, "Unauthorized");
  }

  if (!key || typeof key !== 'string' || !key.trim()) {
    throw new ApiException(400, "key is required and must be a non-empty string");
  }

  return authenticatedRequest<DeleteEnvsResponse>(
    `/envs/${appId}/${encodeURIComponent(key)}`,
    token,
    {
      method: "DELETE",
    }
  );
}