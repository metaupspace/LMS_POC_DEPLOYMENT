import { emailLayout } from './layout';

interface WelcomeEmailData {
  name: string;
  empId: string;
  temporaryPassword: string;
  loginUrl: string;
}

export function welcomeEmail(data: WelcomeEmailData): { subject: string; html: string } {
  const bodyContent = `
    <h2 style="margin:0 0 16px 0;color:#1F2937;font-size:22px;font-weight:600;">Welcome aboard, ${data.name}!</h2>
    <p style="margin:0 0 24px 0;color:#4B5563;font-size:15px;line-height:24px;">
      Your account has been created on LMS Platform. Below are your login credentials to get started.
    </p>

    <!-- Credentials box -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
      <tr>
        <td style="background-color:#FFF7ED;border:1px solid #FDBA74;border-radius:8px;padding:20px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding:0 0 12px 0;">
                <span style="color:#6B7280;font-size:13px;font-weight:500;">Employee ID</span><br>
                <span style="color:#1F2937;font-size:16px;font-weight:600;">${data.empId}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:0;">
                <span style="color:#6B7280;font-size:13px;font-weight:500;">Temporary Password</span><br>
                <span style="color:#1F2937;font-size:16px;font-weight:600;font-family:'Courier New',Courier,monospace;letter-spacing:1px;">${data.temporaryPassword}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px 0;color:#4B5563;font-size:15px;line-height:24px;">
      Please change your password after your first login for security purposes.
    </p>

    <p style="margin:0 0 24px 0;color:#4B5563;font-size:15px;line-height:24px;">
      Click the button below to log in and begin your learning journey.
    </p>

    <!-- CTA Button -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
      <tr>
        <td align="center" style="border-radius:6px;background-color:#FF7A1A;">
          <a href="${data.loginUrl}" target="_blank" style="display:inline-block;padding:14px 32px;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;">
            Log In to LMS Platform
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0;color:#9CA3AF;font-size:13px;line-height:20px;">
      If the button above doesn't work, copy and paste this URL into your browser:<br>
      <a href="${data.loginUrl}" style="color:#FF7A1A;text-decoration:underline;word-break:break-all;">${data.loginUrl}</a>
    </p>`;

  return {
    subject: 'Welcome to LMS Platform',
    html: emailLayout('Welcome to LMS Platform', bodyContent),
  };
}
