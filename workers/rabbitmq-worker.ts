/**
 * RabbitMQ Worker — Standalone process
 *
 * Consumes email_queue and notification_queue.
 * Fully self-contained: all email templates and layout are inlined
 * to avoid tsconfig path-resolution issues with the workers/ directory.
 *
 * Run: npm run worker  (or: npx tsx workers/rabbitmq-worker.ts)
 */

import 'dotenv/config';
import amqplib, { type Channel, type ConsumeMessage } from 'amqplib';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const RABBITMQ_URL = process.env.RABBITMQ_URL!;
const MONGODB_URI = process.env.MONGODB_URI!;

const EMAIL_QUEUE = 'email_queue';
const NOTIFICATION_QUEUE = 'notification_queue';
const MAX_RETRIES = 3;

// ---------------------------------------------------------------------------
// Email Transporter
// ---------------------------------------------------------------------------

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// ---------------------------------------------------------------------------
// Mongoose Models (minimal inline schemas — no src/ imports)
// ---------------------------------------------------------------------------

interface IUser {
  empId?: string;
  name?: string;
  email?: string;
  role?: string;
}

interface INotification {
  user: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: string;
  read: boolean;
  metadata: Record<string, unknown>;
}

const userSchema = new mongoose.Schema<IUser>({
  empId: String,
  name: String,
  email: String,
  role: String,
});
const User =
  (mongoose.models.User as mongoose.Model<IUser>) ||
  mongoose.model<IUser>('User', userSchema);

const notificationSchema = new mongoose.Schema<INotification>(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    title: String,
    message: String,
    type: {
      type: String,
      enum: ['assignment', 'session_reminder', 'proof_update', 'badge_earned', 'streak', 'general'],
    },
    read: { type: Boolean, default: false },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);
const Notification =
  (mongoose.models.Notification as mongoose.Model<INotification>) ||
  mongoose.model<INotification>('Notification', notificationSchema);

// ---------------------------------------------------------------------------
// Email Layout (inline)
// ---------------------------------------------------------------------------

function emailLayout(title: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#F5F6FA;font-family:'Segoe UI',Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F6FA;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#FFFFFF;border-radius:8px;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
          <!-- Orange header bar -->
          <tr>
            <td style="background-color:#FF7A1A;padding:24px 32px;">
              <h1 style="margin:0;color:#FFFFFF;font-size:20px;font-weight:600;letter-spacing:0.3px;">LMS Platform</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              ${bodyContent}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;background-color:#F5F6FA;text-align:center;">
              <p style="margin:0;color:#6B7280;font-size:12px;line-height:18px;">This is an automated email from LMS Platform. Please do not reply.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Email Templates (inline)
// ---------------------------------------------------------------------------

interface WelcomeEmailData {
  name: string;
  empId: string;
  temporaryPassword: string;
  loginUrl: string;
}

function welcomeEmail(data: WelcomeEmailData): { subject: string; html: string } {
  const bodyContent = `
    <h2 style="margin:0 0 16px 0;color:#1F2937;font-size:22px;font-weight:600;">Welcome aboard, ${data.name}!</h2>
    <p style="margin:0 0 24px 0;color:#4B5563;font-size:15px;line-height:24px;">
      Your account has been created on LMS Platform. Below are your login credentials to get started.
    </p>
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

// ---- Course Assignment ----

interface CourseAssignmentData {
  name: string;
  courseName: string;
  courseDescription: string;
  instructorName: string;
  loginUrl: string;
}

function courseAssignmentEmail(data: CourseAssignmentData): { subject: string; html: string } {
  const bodyContent = `
    <h2 style="margin:0 0 16px 0;color:#1F2937;font-size:22px;font-weight:600;">New Course Assigned</h2>
    <p style="margin:0 0 24px 0;color:#4B5563;font-size:15px;line-height:24px;">
      Hi ${data.name}, a new course has been assigned to you. Here are the details:
    </p>
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

// ---- Session Reminder ----

interface SessionReminderData {
  name: string;
  sessionTitle: string;
  date: string;
  timeSlot: string;
  location: string;
  instructorName: string;
}

function sessionReminderEmail(data: SessionReminderData): { subject: string; html: string } {
  const bodyContent = `
    <h2 style="margin:0 0 16px 0;color:#1F2937;font-size:22px;font-weight:600;">Training Session Reminder</h2>
    <p style="margin:0 0 24px 0;color:#4B5563;font-size:15px;line-height:24px;">
      Hi ${data.name}, this is a friendly reminder about your upcoming training session scheduled for tomorrow.
    </p>
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

// ---- Proof Status ----

interface ProofStatusData {
  name: string;
  courseName: string;
  status: 'approved' | 'redo_requested';
  reviewerNote?: string;
  loginUrl: string;
}

function proofStatusEmail(data: ProofStatusData): { subject: string; html: string } {
  const isApproved = data.status === 'approved';
  const statusLabel = isApproved ? 'Approved' : 'Needs Revision';
  const statusColor = isApproved ? '#059669' : '#D97706';
  const statusBgColor = isApproved ? '#ECFDF5' : '#FFFBEB';
  const statusBorderColor = isApproved ? '#A7F3D0' : '#FDE68A';

  const reviewerNoteBlock = data.reviewerNote
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
      <tr>
        <td style="background-color:#F9FAFB;border-left:4px solid #FF7A1A;padding:16px 20px;border-radius:0 8px 8px 0;">
          <span style="color:#6B7280;font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;">Reviewer Note</span><br>
          <span style="color:#374151;font-size:14px;line-height:22px;">${data.reviewerNote}</span>
        </td>
      </tr>
    </table>`
    : '';

  const outcomeText = isApproved
    ? 'Congratulations! Your proof of work has been approved. You have earned bonus points for this submission.'
    : 'Your reviewer has requested revisions. Please review the feedback and resubmit your proof of work.';

  const ctaLabel = isApproved ? 'View Dashboard' : 'Resubmit Proof of Work';

  const bodyContent = `
    <h2 style="margin:0 0 16px 0;color:#1F2937;font-size:22px;font-weight:600;">Proof of Work Update</h2>
    <p style="margin:0 0 24px 0;color:#4B5563;font-size:15px;line-height:24px;">
      Hi ${data.name}, your proof of work submission for <strong>${data.courseName}</strong> has been reviewed.
    </p>
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
    ${reviewerNoteBlock}
    <p style="margin:0 0 24px 0;color:#4B5563;font-size:15px;line-height:24px;">${outcomeText}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
      <tr>
        <td align="center" style="border-radius:6px;background-color:#FF7A1A;">
          <a href="${data.loginUrl}" target="_blank" style="display:inline-block;padding:14px 32px;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;">
            ${ctaLabel}
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

// ---- Badge Earned ----

interface BadgeEarnedData {
  name: string;
  badgeName: string;
  badgeIcon: string;
  totalPoints: number;
}

function badgeEarnedEmail(data: BadgeEarnedData): { subject: string; html: string } {
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

// ---------------------------------------------------------------------------
// Message Types
// ---------------------------------------------------------------------------

interface EmailMessage {
  type: 'welcome' | 'course_assignment' | 'session_reminder' | 'proof_status' | 'badge_earned';
  userId?: string;
  to?: string;
  data: Record<string, unknown>;
  _retryCount?: number;
}

interface NotificationMessage {
  userId: string;
  title: string;
  message: string;
  type: 'assignment' | 'session_reminder' | 'proof_update' | 'badge_earned' | 'streak' | 'general';
  metadata?: Record<string, unknown>;
  _retryCount?: number;
}

// ---------------------------------------------------------------------------
// Template Resolver
// ---------------------------------------------------------------------------

function resolveTemplate(
  type: EmailMessage['type'],
  data: Record<string, unknown>,
): { subject: string; html: string } {
  switch (type) {
    case 'welcome':
      return welcomeEmail(data as unknown as WelcomeEmailData);

    case 'course_assignment':
      return courseAssignmentEmail(data as unknown as CourseAssignmentData);

    case 'session_reminder':
      return sessionReminderEmail(data as unknown as SessionReminderData);

    case 'proof_status':
      return proofStatusEmail(data as unknown as ProofStatusData);

    case 'badge_earned':
      return badgeEarnedEmail(data as unknown as BadgeEarnedData);

    default: {
      const _exhaustive: never = type;
      throw new Error(`Unknown email type: ${_exhaustive}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handleEmailMessage(msg: ConsumeMessage, channel: Channel): Promise<void> {
  const content: EmailMessage = JSON.parse(msg.content.toString());
  const retryCount = content._retryCount ?? 0;

  try {
    // Resolve recipient email
    let toEmail = content.to;
    if (!toEmail && content.userId) {
      const user = await User.findById(content.userId).lean();
      if (!user) {
        console.error(`[Worker] User not found: ${content.userId}`);
        channel.ack(msg);
        return;
      }
      toEmail = user.email;
    }

    if (!toEmail) {
      console.error('[Worker] No email address for message');
      channel.ack(msg);
      return;
    }

    // Render the template
    const { subject, html } = resolveTemplate(content.type, content.data);

    // Send
    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'LMS Platform'}" <${process.env.SMTP_FROM_EMAIL || 'noreply@lmsplatform.com'}>`,
      to: toEmail,
      subject,
      html,
    });

    console.info(`[Worker] Email sent: ${content.type} -> ${toEmail}`);
    channel.ack(msg);
  } catch (error) {
    console.error(`[Worker] Email error:`, error);

    if (retryCount < MAX_RETRIES) {
      const retryContent = { ...content, _retryCount: retryCount + 1 };
      channel.nack(msg, false, false); // don't requeue original
      channel.sendToQueue(EMAIL_QUEUE, Buffer.from(JSON.stringify(retryContent)), {
        persistent: true,
      });
      console.warn(
        `[Worker] Retrying email (${retryCount + 1}/${MAX_RETRIES}): ${content.type}`,
      );
    } else {
      console.error(`[Worker] Max retries reached for email: ${content.type} — giving up`);
      channel.ack(msg);
    }
  }
}

async function handleNotificationMessage(msg: ConsumeMessage, channel: Channel): Promise<void> {
  const content: NotificationMessage = JSON.parse(msg.content.toString());
  const retryCount = content._retryCount ?? 0;

  try {
    await Notification.create({
      user: content.userId,
      title: content.title,
      message: content.message,
      type: content.type,
      metadata: content.metadata ?? {},
    });

    console.info(`[Worker] Notification created for user: ${content.userId}`);
    channel.ack(msg);
  } catch (error) {
    console.error(`[Worker] Notification error:`, error);

    if (retryCount < MAX_RETRIES) {
      const retryContent = { ...content, _retryCount: retryCount + 1 };
      channel.nack(msg, false, false);
      channel.sendToQueue(NOTIFICATION_QUEUE, Buffer.from(JSON.stringify(retryContent)), {
        persistent: true,
      });
      console.warn(
        `[Worker] Retrying notification (${retryCount + 1}/${MAX_RETRIES}): ${content.type}`,
      );
    } else {
      console.error(
        `[Worker] Max retries reached for notification: ${content.type} — giving up`,
      );
      channel.ack(msg);
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.info('[Worker] Starting RabbitMQ worker...');

  // Connect to MongoDB
  await mongoose.connect(MONGODB_URI);
  console.info('[Worker] MongoDB connected');

  // Connect to RabbitMQ
  const connection = await amqplib.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();
  await channel.prefetch(5);

  // Assert queues with 24-hour TTL
  await channel.assertQueue(EMAIL_QUEUE, {
    durable: true,
    arguments: { 'x-message-ttl': 86400000 },
  });
  await channel.assertQueue(NOTIFICATION_QUEUE, {
    durable: true,
    arguments: { 'x-message-ttl': 86400000 },
  });

  console.info('[Worker] Queues asserted. Consuming...');

  // Start consuming
  channel.consume(EMAIL_QUEUE, (msg) => {
    if (msg) handleEmailMessage(msg, channel);
  });

  channel.consume(NOTIFICATION_QUEUE, (msg) => {
    if (msg) handleNotificationMessage(msg, channel);
  });

  console.info('[Worker] Ready. Waiting for messages...');

  // Graceful shutdown
  const shutdown = async () => {
    console.info('[Worker] Shutting down...');
    try {
      await channel.close();
      await connection.close();
      await mongoose.disconnect();
      console.info('[Worker] Disconnected. Bye.');
    } catch (err) {
      console.error('[Worker] Error during shutdown:', err);
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[Worker] Fatal error:', err);
  process.exit(1);
});
