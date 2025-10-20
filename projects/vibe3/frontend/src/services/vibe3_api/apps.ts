import { API_BASE_URL, authenticatedRequest, tokenManager } from "./auth";
import { type EnvItem } from "./envs";
import { type MessageItem } from "./messages";
import { ApiException, type Profile } from "./auth";

export interface AppItem {
  id: string;
  name: string;
  owner?: Profile;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface MyAppsResponse {
  success: boolean;
  message: string;
  data: {
    apps: AppItem[];
  };
}

export interface AppResponse {
  success: boolean;
  message: string;
  data: AppItem;
}

export interface UpdateAppResponse {
  success: boolean;
  message: string;
  data: {
    appId: string;
    fileName: string;
    fileSize: number;
    uploadedAt: string;
  };
}

export async function getMyApps() {
  const token = tokenManager.getToken()!;
  const response = await authenticatedRequest<MyAppsResponse>(
    "/apps/mine",
    token,
    {
      method: "GET",
    }
  );

  return response;
}

export async function getApp(id: string) {
  const token = tokenManager.getToken()!;
  const response = await authenticatedRequest<AppResponse>(
    `/apps/${id}`,
    token,
    {
      method: "GET",
    }
  );
  return response;
}

export async function getAppFile(id: string): Promise<Blob> {
  const token = tokenManager.getToken()!;
  const response = await fetch(`${API_BASE_URL}/apps/files/${id}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.blob();
  return data;
}

export async function createApp(name: string, description: string) {
  const token = tokenManager.getToken()!;
  const response = await authenticatedRequest<AppResponse>(
    `/apps/create`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ name, description }),
    }
  );

  return response;
}

export async function updateApp(id: string, zip: Blob) {
  const token = tokenManager.getToken()!;
  const formData = new FormData();
  formData.append('file', zip);
  const response = await authenticatedRequest<UpdateAppResponse>(
    `/apps/files/update/${id}`,
    token,
    {
      method: "POST",
      body: formData,
    }
  );
  return response;
}

export async function updateAppInfo(opts: {name?: string, description?: string, id: string}) {
  const token = tokenManager.getToken();
  if (!token) {
    throw new ApiException(401, "Unauthorized");
  }
  
  const response = await authenticatedRequest<UpdateAppResponse>(
    `/apps/update/${opts.id}`,
    token,
    {
      method: "POST",
      body: JSON.stringify(opts),
    }
  );
  
  return response;
}

export interface AppOverviewResponse {
  success: boolean;
  message: string;
  data: {
    app: AppItem;
    envs: EnvItem[];
    messages: number;
  };
}

export async function getAppOverview(id: string) {
  const token = tokenManager.getToken();
  if (!token) {
    throw new ApiException(401, "Unauthorized");
  }
  
  const response = await authenticatedRequest<AppOverviewResponse>(
    `/apps/overview/${id}`,
    token,
    {
      method: "GET",
    }
  );



  return response;
}
