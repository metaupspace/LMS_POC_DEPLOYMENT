import { type NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/rbac';
import { uploadFile } from '@/lib/cloudinary/config';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';

const MAX_PROOF_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_CONTENT_SIZE = 50 * 1024 * 1024; // 50MB for course content

// POST /api/upload
export const POST = withAuth(
  async (request: NextRequest) => {
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const folder = (formData.get('folder') as string) ?? 'general';
      const type = (formData.get('type') as string) ?? 'general';

      if (!file) {
        return errorResponse('File is required', 400);
      }

      // Validate file size based on type
      const maxSize = type === 'proof' ? MAX_PROOF_SIZE : MAX_CONTENT_SIZE;
      if (file.size > maxSize) {
        const maxMB = maxSize / (1024 * 1024);
        return errorResponse(`File size must be ${maxMB}MB or less`, 400);
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await uploadFile(buffer, folder);

      return successResponse(
        {
          url: result.url,
          publicId: result.publicId,
          format: result.format,
          size: result.size,
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
