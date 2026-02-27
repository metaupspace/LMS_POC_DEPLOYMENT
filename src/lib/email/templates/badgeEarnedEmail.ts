import { emailLayout } from './layout';

interface BadgeEarnedData {
  name: string;
  badgeName: string;
  badgeIcon: string;
  totalPoints: number;
}

export function badgeEarnedEmail(data: BadgeEarnedData): { subject: string; html: string } {
  const bodyContent = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding:0 0 16px 0;">
          <span style="font-size:64px;line-height:1;">${data.badgeIcon}</span>
        </td>
      </tr>
    </table>

    <h2 style="margin:0 0 8px 0;color:#1F2937;font-size:22px;font-weight:600;text-align:center;">Congratulations, ${data.name}!</h2>
    <p style="margin:0 0 24px 0;color:#4B5563;font-size:15px;line-height:24px;text-align:center;">
      You have earned a new badge for your outstanding progress on LMS Platform.
    </p>

    <!-- Badge card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#FFF7ED 0%,#FFEDD5 100%);border:2px solid #FDBA74;border-radius:12px;padding:24px 32px;text-align:center;">
            <tr>
              <td align="center" style="padding:0 0 8px 0;">
                <span style="font-size:40px;line-height:1;">${data.badgeIcon}</span>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 0 4px 0;">
                <span style="color:#1F2937;font-size:20px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">${data.badgeName}</span>
              </td>
            </tr>
            <tr>
              <td align="center">
                <span style="color:#FF7A1A;font-size:14px;font-weight:600;">Badge</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Points summary -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
      <tr>
        <td style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:16px 24px;text-align:center;">
          <span style="color:#6B7280;font-size:13px;font-weight:500;">Your Total Points</span><br>
          <span style="color:#FF7A1A;font-size:28px;font-weight:700;">${data.totalPoints.toLocaleString()}</span>
        </td>
      </tr>
    </table>

    <p style="margin:0;color:#4B5563;font-size:15px;line-height:24px;text-align:center;">
      Keep up the great work! Continue completing courses and modules to earn more badges and climb the leaderboard.
    </p>`;

  return {
    subject: `Congratulations! You've earned the ${data.badgeName} badge!`,
    html: emailLayout('New Badge Earned', bodyContent),
  };
}
