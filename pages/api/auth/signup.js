// pages/api/auth/signup.js

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, password, username, honeypot } = req.body || {}

    // Basic payload validation
    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Honeypot check (bot trap)
    if (honeypot) {
      return res.status(400).json({ error: 'Spam detected' })
    }

    // Disposable email domain check
    const disposableDomains = ['10minutemail.com', 'mailinator.com']
    const emailDomain = String(email).split('@')[1] || ''
    if (disposableDomains.includes(emailDomain.toLowerCase())) {
      return res.status(400).json({ error: 'Please use a permanent email' })
    }

    // TODO: Implement actual signup logic here
    // Examples:
    // - Create a Supabase user with email/password
    // - Store an application profile row
    // - Send verification email
    //
    // Pseudocode example using Supabase (server-side service key):
    // const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    // const { data, error } = await supabase.auth.admin.createUser({
    //   email,
    //   password,
    //   email_confirm: false,
    //   user_metadata: { username, is_approved: false }
    // })
    // if (error) return res.status(400).json({ error: error.message })
    // await sendVerificationEmail(email)
    //
    // For now, return a placeholder success response:

    return res.status(200).json({
      success: true,
      message: 'Signup request accepted. Verification email will be sent.',
      user_preview: {
        username,
        email,
        is_approved: false
      }
    })
  } catch (e) {
    // Avoid leaking internal error details
    console.error('Signup error:', e)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
