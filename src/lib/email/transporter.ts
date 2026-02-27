import nodemailer from 'nodemailer';

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME ?? 'LMS Platform'}" <${process.env.SMTP_FROM_EMAIL ?? 'noreply@lmsplatform.com'}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
}
