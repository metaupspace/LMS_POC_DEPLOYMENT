import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import ProofOfWork from '@/lib/db/models/ProofOfWork';
import Course from '@/lib/db/models/Course';
import { withAuth } from '@/lib/auth/rbac';
import { uploadFile } from '@/lib/cloudinary/config';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';
import { updateStreak } from '@/lib/utils/updateStreak';
import { publishToQueue } from '@/lib/rabbitmq/producer';
import { QUEUE_NAMES } from '@/lib/rabbitmq/connection';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

// POST /api/proof-of-work/upload
export const POST = withAuth(
  async (request: NextRequest) => {
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const courseId = formData.get('courseId') as string | null;

      if (!file) {
        return errorResponse('File is required', 400);
      }
      if (!courseId) {
        return errorResponse('Course ID is required', 400);
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return errorResponse('File size must be 2MB or less', 400);
      }

      const currentUserId = request.headers.get('x-user-id') ?? '';

      // Determine correct Cloudinary resource_type based on MIME
      // PDFs MUST be 'raw' — Cloudinary corrupts them when uploaded as 'image' or 'auto'
      let resourceType: 'image' | 'video' | 'raw' = 'raw';
      if (file.type.startsWith('image/')) {
        resourceType = 'image';
      } else if (file.type.startsWith('video/')) {
        resourceType = 'video';
      }

      // Upload to Cloudinary
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploadResult = await uploadFile(buffer, 'proof-of-work', { resourceType });

      await connectDB();

      const record = await ProofOfWork.create({
        user: currentUserId,
        course: courseId,
        fileUrl: uploadResult.url,
        fileType: file.type,
        fileSize: file.size,
        status: 'submitted',
        submittedAt: new Date(),
      });

      // Update daily streak on proof submission
      await updateStreak(currentUserId);

      // Notify the course's coach about the submission
      const course = await Course.findById(courseId).select('coach title').lean();
      if (course?.coach) {
        const coachId = course.coach.toString();
        const learnerName = request.headers.get('x-user-name') ?? 'A learner';

        await publishToQueue(QUEUE_NAMES.NOTIFICATION, {
          type: 'proof_submitted',
          payload: {
            userIds: [coachId],
            courseId,
            courseTitle: course.title,
            learnerId: currentUserId,
            learnerName,
            proofId: record._id.toString(),
          },
          timestamp: new Date().toISOString(),
        }).catch(() => {});
      }

      return successResponse(record.toJSON(), 'Proof of work submitted', 201);
    } catch (err) {
      console.error('[ProofOfWork/Upload] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['staff']
);
