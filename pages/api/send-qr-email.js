// pages/api/send-qr-email.js
import nodemailer from 'nodemailer'
import QRCode from 'qrcode'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { qrCodes = [], restaurantData = {}, isIncremental = false } = req.body

  try {
    // Debug: confirm env vars are present in production logs (safe – does not print password)
    const smtpUser = process.env.EMAIL_USER
    const hasPass = !!process.env.EMAIL_PASS
    console.log('SMTP user:', smtpUser || '(unset)', 'SMTP pass set:', hasPass)

    if (!smtpUser || !hasPass) {
      console.error('Missing EMAIL_USER or EMAIL_PASS in environment')
      return res.status(500).json({ error: 'SMTP credentials not configured' })
    }

    // 1) Generate QR buffers (PNG) and assign unique CIDs
    const attachments = await Promise.all(
      qrCodes.map(async (qr, idx) => {
        const pngBuffer = await QRCode.toBuffer(qr.qrUrl, {
          width: 300,
          margin: 2,
          type: 'png',
          color: { dark: '#000000', light: '#FFFFFF' }
        })
        return {
          filename: `qr-${qr.tableId}.png`,
          content: pngBuffer,
          cid: `qr${idx}@restaurant` // referenced in <img src="cid:qr{idx}@restaurant" />
        }
      })
    )

    // 2) Create transporter (explicit Gmail SMTP settings)
    // Option A: Port 465 SSL
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // true for 465, false for 587 + STARTTLS
      auth: {
        user: smtpUser,
        pass: process.env.EMAIL_PASS
      }
    })

    // 3) Build email
    const subject = isIncremental
      ? `Additional QR Codes for ${restaurantData.restaurantName}`
      : `QR Codes for ${restaurantData.restaurantName}`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width:800px; margin:0 auto;">
        <h1 style="color:#333;">
          ${isIncremental ? 'Additional' : 'New'} QR Codes – ${restaurantData.restaurantName || ''}
        </h1>
        ${isIncremental ? `
          <div style="background:#fff3cd; padding:15px; border:1px solid #ffeaa7; border-radius:8px; margin:15px 0;">
            <p><strong>⚠️ Table Expansion:</strong> 
              ${restaurantData.restaurantName || ''} added ${restaurantData.newTablesAdded || ''} tables 
              (${restaurantData.tablePrefix || ''} ${restaurantData.fromTable || ''}–${restaurantData.tablePrefix || ''} ${restaurantData.toTable || ''}).
            </p>
          </div>` : ''}
        <div style="background:#f5f5f5; padding:20px; border-radius:8px; margin-bottom:20px;">
          <h2>Restaurant Details</h2>
          <p><strong>Name:</strong> ${restaurantData.restaurantName || ''}</p>
          <p><strong>Legal Name:</strong> ${restaurantData.legalName || ''}</p>
          <p><strong>Phone:</strong> ${restaurantData.phone || ''}</p>
          <p><strong>Email:</strong> ${restaurantData.email || ''}</p>
          <p><strong>Address:</strong> ${restaurantData.address || ''}</p>
          <p><strong>${isIncremental ? 'New Tables' : 'Total Tables'}:</strong> ${attachments.length}</p>
        </div>
        <h2>QR Codes to Print</h2>
        <p>Print each QR with <em>“Scan me to order”</em> and deliver to the above address.</p>
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(250px,1fr)); gap:20px;">
          ${attachments.map((att, idx) => `
            <div style="text-align:center; border:1px solid #ddd; padding:20px; border-radius:8px;">
              <h3 style="margin-top:0; color:${isIncremental ? '#d97706' : '#333'};">
                ${qrCodes[idx]?.tableNumber || ''} ${isIncremental ? '(NEW)' : ''}
              </h3>
              <img src="cid:${att.cid}" alt="QR Code for ${qrCodes[idx]?.tableNumber || ''}" style="max-width:200px;" />
              <p style="margin-top:8px; color:#666;">Scan me to order</p>
            </div>
          `).join('')}
        </div>
      </div>
    `

    // 4) Send email with inline attachments
    await transporter.sendMail({
      from: smtpUser,
      to: 'pnriyas49@gmail.com',
      subject,
      html,
      attachments
    })

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('Email sending failed:', err)
    return res.status(500).json({ error: 'Failed to send email' })
  }
}
