/* eslint-disable no-console */
import { connectDB } from '@/lib/db/connect';
import ProofOfWork from '@/lib/db/models/ProofOfWork';
import { withAuth } from '@/lib/auth/rbac';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';

// GET /api/admin/repair-proofs
// One-time utility: finds 0-byte PDF proofs and resets them to 'rejected' for re-upload
export const GET = withAuth(async () => {
  try {
    await connectDB();

    // Find all PDF proofs
    const pdfProofs = await ProofOfWork.find({
      $or: [
        { fileType: { $regex: /pdf/i } },
        { fileName: { $regex: /\.pdf$/i } },
        { fileUrl: { $regex: /\.pdf/i } },
      ],
    })
      .populate('user', 'name empId')
      .populate('course', 'title')
      .lean();

    const results = [];

    for (const proof of pdfProofs) {
      try {
        const response = await fetch(proof.fileUrl, { method: 'HEAD' });
        const contentLength = parseInt(response.headers.get('content-length') || '0');

        const user = proof.user as any;
        const course = proof.course as any;

        results.push({
          proofId: proof._id,
          userName: user?.name,
          empId: user?.empId,
          courseTitle: course?.title,
          fileUrl: proof.fileUrl,
          status: proof.status,
          fileSize: contentLength,
          isBroken: contentLength === 0,
        });
      } catch {
        const user = proof.user as any;
        const course = proof.course as any;

        results.push({
          proofId: proof._id,
          userName: user?.name,
          empId: user?.empId,
          courseTitle: course?.title,
          fileUrl: proof.fileUrl,
          status: proof.status,
          fileSize: -1,
          isBroken: true,
        });
      }
    }

    const brokenCount = results.filter((r) => r.isBroken).length;

    // Reset broken proofs to 'rejected' so learners can re-upload
    if (brokenCount > 0) {
      const brokenIds = results.filter((r) => r.isBroken).map((r) => r.proofId);
      await ProofOfWork.updateMany(
        { _id: { $in: brokenIds } },
        {
          status: 'rejected',
          reviewNote: 'Your PDF upload was corrupted. Please re-upload your proof of work.',
          reviewedAt: new Date(),
        }
      );
    }

    console.log(`[RepairProofs] ${pdfProofs.length} PDFs checked, ${brokenCount} broken and reset.`);

    return successResponse({
      totalPDFs: pdfProofs.length,
      brokenCount,
      fixedCount: brokenCount,
      details: results,
      message:
        brokenCount > 0
          ? `${brokenCount} broken PDFs found and reset to 'rejected' for re-upload.`
          : 'All PDFs are valid.',
    });
  } catch (err) {
    console.error('[RepairProofs] Error:', err instanceof Error ? err.message : err);
    return errorResponse('Internal server error', 500);
  }
}, ['admin']);
