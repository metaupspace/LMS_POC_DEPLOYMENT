import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  size: number;
  duration?: number;
  width?: number;
  height?: number;
  resourceType?: string;
}

export async function uploadFile(
  buffer: Buffer,
  folder: string,
  options?: { resourceType?: 'image' | 'video' | 'raw' | 'auto' }
): Promise<UploadResult> {
  const resourceType = options?.resourceType ?? 'auto';

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: `lms/${folder}`,
          resource_type: resourceType,
        },
        (error, result?: UploadApiResponse) => {
          if (error || !result) {
            reject(error ?? new Error('Upload failed'));
            return;
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            size: result.bytes,
            duration: result.duration ?? undefined,
            width: result.width ?? undefined,
            height: result.height ?? undefined,
            resourceType: result.resource_type ?? undefined,
          });
        }
      )
      .end(buffer);
  });
}

export async function deleteFile(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

export { cloudinary };
