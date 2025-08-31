// lib/email.js
import nodemailer from 'nodemailer'

/**
 * sendMail: minimal SMTP wrapper for transactional emails
 * Required env:
 *  - SMTP_HOST
 *  - SMTP_PORT
 *  - SMTP_USER
 *  - SMTP_PASS
 *  - SMTP_FROM (e.g. '"Cafe QR" <noreply@yourdomain.com>')
 */
export async function sendMail({ to, subject, text, html }) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.SMTP_FROM) {
    console.warn('Email disabled: missing SMTP env vars (SMTP_HOST/PORT/USER/PASS/FROM)')
    return { ok: false, skipped: true, reason: 'missing_env' }
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465, // true only for 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text,
    html,
  })

  return { ok: true, messageId: info?.messageId }
}
