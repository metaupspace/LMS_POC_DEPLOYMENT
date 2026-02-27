import { emailLayout } from './layout';

interface CourseAssignmentData {
  name: string;
  courseName: string;
  courseDescription: string;
  instructorName: string;
  loginUrl: string;
}

export function courseAssignmentEmail(data: CourseAssignmentData): { subject: string; html: string } {
  const bodyContent = `
    <h2 style="margin:0 0 16px 0;color:#1F2937;font-size:22px;font-weight:600;">New Course Assigned</h2>
    <p style="margin:0 0 24px 0;color:#4B5563;font-size:15px;line-height:24px;">
      Hi ${data.name}, a new course has been assigned to you. Here are the details:
    </p>

    <!-- Course details card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
      <tr>
        <td style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:20px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding:0 0 16px 0;">
                <span style="color:#6B7280;font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;">Course</span><br>
                <span style="color:#1F2937;font-size:18px;font-weight:600;">${data.courseName}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 16px 0;">
                <span style="color:#6B7280;font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;">Description</span><br>
                <span style="color:#4B5563;font-size:14px;line-height:22px;">${data.courseDescription}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:0;">
                <span style="color:#6B7280;font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;">Instructor</span><br>
                <span style="color:#1F2937;font-size:15px;font-weight:500;">${data.instructorName}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 24px 0;color:#4B5563;font-size:15px;line-height:24px;">
      Log in to your dashboard to start learning. Complete all modules to earn points and badges!
    </p>

    <!-- CTA Button -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
      <tr>
        <td align="center" style="border-radius:6px;background-color:#FF7A1A;">
          <a href="${data.loginUrl}" target="_blank" style="display:inline-block;padding:14px 32px;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;">
            Start Learning
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0;color:#9CA3AF;font-size:13px;line-height:20px;">
      If the button above doesn't work, copy and paste this URL into your browser:<br>
      <a href="${data.loginUrl}" style="color:#FF7A1A;text-decoration:underline;word-break:break-all;">${data.loginUrl}</a>
    </p>`;

  return {
    subject: `New Course Assigned: ${data.courseName}`,
    html: emailLayout(`New Course Assigned: ${data.courseName}`, bodyContent),
  };
}
