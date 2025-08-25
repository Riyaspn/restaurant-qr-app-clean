// pages/api/send-qr-email.js
import nodemailer from 'nodemailer'
import QRCode from 'qrcode'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { qrCodes = [], restaurantData = {}, isIncremental = false } = req.body

  try {
    // 1) Generate QR buffers and assign unique CIDs
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
          cid: `qr${idx}@restaurant` // use in img src as cid:qr0@restaurant, etc.
        }
      })
    )

    // 2) Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    })

    const subject = isIncremental
      ? `Additional QR Codes for ${restaurantData.restaurantName}`
      : `QR Codes for ${restaurantData.restaurantName}`

    // 3) Build HTML with inline CID images
    const html = `
      <div style="font-family: Arial, sans-serif; max-width:800px; margin:0 auto;">
        <h1 style="color:#333;">
          ${isIncremental ? 'Additional' : 'New'} QR Codes – ${restaurantData.restaurantName}
        </h1>
        ${isIncremental ? `
          <div style="background:#fff3cd; padding:15px; border:1px solid #ffeaa7; border-radius:8px; margin:15px 0;">
            <p><strong>⚠️ Table Expansion:</strong> 
              ${restaurantData.restaurantName} added ${restaurantData.newTablesAdded} tables 
              (${restaurantData.tablePrefix} ${restaurantData.fromTable}–${restaurantData.tablePrefix} ${restaurantData.toTable}).
            </p>
          </div>` : ''}
        <div style="background:#f5f5f5; padding:20px; border-radius:8px; margin-bottom:20px;">
          <h2>Restaurant Details</h2>
          <p><strong>Name:</strong> ${restaurantData.restaurantName}</p>
          <p><strong>Legal Name:</strong> ${restaurantData.legalName}</p>
          <p><strong>Phone:</strong> ${restaurantData.phone}</p>
          <p><strong>Email:</strong> ${restaurantData.email}</p>
          <p><strong>Address:</strong> ${restaurantData.address}</p>
          <p><strong>${isIncremental ? 'New Tables' : 'Total Tables'}:</strong> ${attachments.length}</p>
        </div>
        <h2>QR Codes to Print</h2>
        <p>Print each QR with <em>“Scan me to order”</em> and deliver to the above address.</p>
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(250px,1fr)); gap:20px;">
          ${attachments.map((att, idx) => `
            <div style="text-align:center; border:1px solid #ddd; padding:20px; border-radius:8px;">
              <h3 style="margin-top:0; color:${isIncremental?'#d97706':'#333'};">
                ${qrCodes[idx].tableNumber} ${isIncremental?'(NEW)':''}
              </h3>
              <img src="cid:${att.cid}" alt="QR Code for ${qrCodes[idx].tableNumber}" style="max-width:200px;" />
              <p style="margin-top:8px; color:#666;">Scan me to order</p>
            </div>
          `).join('')}
        </div>
      </div>
    `

    // 4) Send email with inline attachments
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'pnriyas49@gmail.com',
      subject,
      html,
      attachments // include inline PNGs
    })

    res.status(200).json({ success: true })
  } catch (err) {
    console.error('Email sending failed:', err)
    res.status(500).json({ error: 'Failed to send email' })
  }
}
