export type MediaType = "IMAGE" | "VIDEO" | "AUDIO";

export type StorageProviderType = "LOCAL" | "S3";

export type MediaAssetDetail = {
  id: string;
  workspaceId: string;
  testimonialId?: string | null;
  type: MediaType;
  storageProvider: StorageProviderType;
  url: string;
  mimeType: string;
  fileSizeBytes: number;
  durationSeconds?: number | null;
  createdAt: string;
};

export type UploadValidationOptions = {
  allowedTypes?: MediaType[];
  maxSizeBytes?: number;
};

export type UploadSuccessResponse = {
  success: true;
  asset: MediaAssetDetail;
};

export type UploadErrorResponse = {
  success: false;
  error: string;
};

