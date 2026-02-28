import { type NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/rbac';
import { uploadFile } from '@/lib/cloudinary/config';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';

const MAX_PROOF_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_CONTENT_SIZE = 50 * 1024 * 1024; // 50MB for course content (images, etc.)
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB for video uploads

// POST /api/upload
export const POST = withAuth(
  async (request: NextRequest) => {
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const folder = (formData.get('folder') as string) ?? 'general';
      const type = (formData.get('type') as string) ?? 'general';
      const resourceType = (formData.get('resource_type') as string) ?? undefined;

      if (!file) {
        return errorResponse('File is required', 400);
      }

      // Determine max size based on type or resource_type
      let maxSize = MAX_CONTENT_SIZE;
      if (type === 'proof') {
        maxSize = MAX_PROOF_SIZE;
      } else if (resourceType === 'video') {
        maxSize = MAX_VIDEO_SIZE;
      }

      if (file.size > maxSize) {
        const maxMB = maxSize / (1024 * 1024);
        return errorResponse(`File size must be ${maxMB}MB or less`, 400);
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await uploadFile(buffer, folder, {
        resourceType: (resourceType as 'image' | 'video' | 'raw' | 'auto') ?? undefined,
      });

      return successResponse(
        {
          url: result.url,
          publicId: result.publicId,
          format: result.format,
          size: result.size,
          duration: result.duration ?? null,
          width: result.width ?? null,
          height: result.height ?? null,
          resourceType: result.resourceType ?? null,
        },
        'File uploaded successfully',
        201
      );
    } catch (err) {
      console.error('[Upload] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin', 'manager', 'coach', 'staff']
);
