import { emailLayout } from './layout';

interface SessionReminderData {
  name: string;
  sessionTitle: string;
  date: string;
  timeSlot: string;
  location: string;
  instructorName: string;
}

export function sessionReminderEmail(data: SessionReminderData): { subject: string; html: string } {
  const bodyContent = `
    <h2 style="margin:0 0 16px 0;color:#1F2937;font-size:22px;font-weight:600;">Training Session Reminder</h2>
    <p style="margin:0 0 24px 0;color:#4B5563;font-size:15px;line-height:24px;">
      Hi ${data.name}, this is a friendly reminder about your upcoming training session scheduled for tomorrow.
    </p>

    <!-- Session details card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
      <tr>
        <td style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:20px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding:0 0 14px 0;">
                <span style="color:#6B7280;font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;">Session</span><br>
                <span style="color:#1F2937;font-size:18px;font-weight:600;">${data.sessionTitle}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 14px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td width="50%" valign="top" style="padding:0 8px 0 0;">
                      <span style="color:#6B7280;font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;">Date</span><br>
                      <span style="color:#1F2937;font-size:15px;font-weight:500;">${data.date}</span>
                    </td>
                    <td width="50%" valign="top" style="padding:0 0 0 8px;">
                      <span style="color:#6B7280;font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;">Time</span><br>
                      <span style="color:#1F2937;font-size:15px;font-weight:500;">${data.timeSlot}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 14px 0;">
                <span style="color:#6B7280;font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;">Location</span><br>
                <span style="color:#1F2937;font-size:15px;font-weight:500;">${data.location}</span>
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

    <p style="margin:0 0 8px 0;color:#4B5563;font-size:15px;line-height:24px;">
      Please ensure you are on time. If you are unable to attend, notify your instructor in advance.
    </p>`;

  return {
    subject: 'Reminder: Training Session Tomorrow',
    html: emailLayout('Training Session Reminder', bodyContent),
  };
}
