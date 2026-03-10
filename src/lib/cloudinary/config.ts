import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  url: string;
  hlsUrl?: string;
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
  const isVideo = resourceType === 'video';

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: `lms/${folder}`,
          resource_type: resourceType,
          // Request HLS adaptive streaming for videos
          ...(isVideo && {
            eager: [{ streaming_profile: 'auto', format: 'm3u8' }],
            eager_async: true,
          }),
        },
        (error, result?: UploadApiResponse) => {
          if (error || !result) {
            reject(error ?? new Error('Upload failed'));
            return;
          }

          // Generate HLS URL for video uploads
          let hlsUrl: string | undefined;
          if (isVideo || result.resource_type === 'video') {
            hlsUrl = cloudinary.url(result.public_id, {
              resource_type: 'video',
              streaming_profile: 'auto',
              format: 'm3u8',
            });
          }

          resolve({
            url: result.secure_url,
            hlsUrl,
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
