// lib/email.js
import nodemailer from 'nodemailer'

export async function sendEmail({ to, subject, text, html }) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM, // e.g. '"Cafe QR" <no-reply@yourdomain.com>'
    to,
    subject,
    text,
    html,
  });
}
