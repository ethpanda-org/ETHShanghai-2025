import { tokenManager, API_BASE_URL, authenticatedRequest } from "./auth";

export interface PublishAppResponse {
  success: boolean;
  message: string;
  data: {
    appId: string;
    previewUrl: string;
  };
}

export async function publishApp(opts: {
  appId: string;
  zip: Blob;
  domain?: string;
}): Promise<string> {
  const token = tokenManager.getToken()!;
  if (!token) {
    throw new Error("Please login first");
  }

  const formData = new FormData();
  formData.append("file", opts.zip);

  const response = await authenticatedRequest<PublishAppResponse>(
    `/build/${opts.appId}`,
    token,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.success) {
    throw new Error(response.message);
  }

  return response.data.previewUrl;
}
