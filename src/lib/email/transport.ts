import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  await transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME || 'LMS Platform'}" <${process.env.SMTP_FROM_EMAIL || 'noreply@lmsplatform.com'}>`,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  });
}
