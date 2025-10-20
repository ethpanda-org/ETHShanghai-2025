import { zipToFileSystemTree } from "@/uitls/files";
import { authenticatedRequest, tokenManager } from "./auth";

export async function getDepts() {
  const fetchDepts = await fetch(`/files/node_modules.zip`, {
    method: "GET",
    headers: {
      "Content-Type": "application/zip",
    },
  });

  const blob = await fetchDepts.blob();

  const fileTree = await zipToFileSystemTree(blob);

  return fileTree;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  data?: {
    url: string;
  };
  error?: string;
}

export async function upload(
  file: File,
  filename?: string
): Promise<UploadResponse> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("content_type", file.type);
    if (filename) {
      formData.append("filename", filename);
    }
    
    const token = tokenManager.getToken()!;
    if (!token) {
      throw new Error("No token found, please login first");
    }

    const response = await authenticatedRequest<UploadResponse>(
      "/upload",
      token,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.success) {
      return {
        success: false,
        message: response.message || "Upload failed",
        error: response.error,
      };
    }

    return response;
  } catch (error) {
    console.error("Error uploading file:", error);
    return {
      success: false,
      message: "Failed to upload file",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
