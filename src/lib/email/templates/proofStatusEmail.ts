import { emailLayout } from './layout';

interface ProofStatusData {
  name: string;
  courseName: string;
  status: 'approved' | 'redo_requested';
  reviewerNote?: string;
  loginUrl: string;
}

export function proofStatusEmail(data: ProofStatusData): { subject: string; html: string } {
  const isApproved = data.status === 'approved';
  const statusLabel = isApproved ? 'Approved' : 'Needs Revision';
  const statusColor = isApproved ? '#059669' : '#D97706';
  const statusBgColor = isApproved ? '#ECFDF5' : '#FFFBEB';
  const statusBorderColor = isApproved ? '#A7F3D0' : '#FDE68A';

  const bodyContent = `
    <h2 style="margin:0 0 16px 0;color:#1F2937;font-size:22px;font-weight:600;">Proof of Work Update</h2>
    <p style="margin:0 0 24px 0;color:#4B5563;font-size:15px;line-height:24px;">
      Hi ${data.name}, your proof of work submission for <strong>${data.courseName}</strong> has been reviewed.
    </p>

    <!-- Status badge -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
      <tr>
        <td style="background-color:${statusBgColor};border:1px solid ${statusBorderColor};border-radius:8px;padding:20px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td>
                <span style="color:#6B7280;font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;">Status</span><br>
                <span style="color:${statusColor};font-size:18px;font-weight:700;">${statusLabel}</span>
              </td>
            </tr>
            <tr>
              <td style="padding-top:12px;">
                <span style="color:#6B7280;font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;">Course</span><br>
                <span style="color:#1F2937;font-size:15px;font-weight:500;">${data.courseName}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${
      data.reviewerNote
        ? `
    <!-- Reviewer note -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
      <tr>
        <td style="background-color:#F9FAFB;border-left:4px solid #FF7A1A;padding:16px 20px;border-radius:0 8px 8px 0;">
          <span style="color:#6B7280;font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;">Reviewer Note</span><br>
          <span style="color:#374151;font-size:14px;line-height:22px;">${data.reviewerNote}</span>
        </td>
      </tr>
    </table>`
        : ''
    }

    ${
      isApproved
        ? `<p style="margin:0 0 24px 0;color:#4B5563;font-size:15px;line-height:24px;">
        Congratulations! Your proof of work has been approved. You have earned bonus points for this submission.
      </p>`
        : `<p style="margin:0 0 24px 0;color:#4B5563;font-size:15px;line-height:24px;">
        Your reviewer has requested revisions. Please review the feedback and resubmit your proof of work.
      </p>`
    }

    <!-- CTA Button -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
      <tr>
        <td align="center" style="border-radius:6px;background-color:#FF7A1A;">
          <a href="${data.loginUrl}" target="_blank" style="display:inline-block;padding:14px 32px;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;">
            ${isApproved ? 'View Dashboard' : 'Resubmit Proof of Work'}
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0;color:#9CA3AF;font-size:13px;line-height:20px;">
      If the button above doesn't work, copy and paste this URL into your browser:<br>
      <a href="${data.loginUrl}" style="color:#FF7A1A;text-decoration:underline;word-break:break-all;">${data.loginUrl}</a>
    </p>`;

  return {
    subject: `Proof of Work: ${statusLabel}`,
    html: emailLayout(`Proof of Work: ${statusLabel}`, bodyContent),
  };
}
