// pages/api/auth/signup.js
import { Ratelimit } from '@upstash/ratelimit';

const signupRateLimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(3, '3600 s') // 3 per hour
});

export default async function handler(req, res) {
  // Honeypot check
  if (req.body.honeypot) {
    return res.status(400).json({ error: 'Spam detected' });
  }
  
  // Rate limiting
  const { success } = await signupRateLimit.limit(req.ip);
  if (!success) {
    return res.status(429).json({ error: 'Too many signups' });
  }
  
  // Disposable email check
  const disposableDomains = ['10minutemail.com', 'mailinator.com'];
  const emailDomain = req.body.email.split('@')[1];
  if (disposableDomains.includes(emailDomain)) {
    return res.status(400).json({ error: 'Please use a permanent email' });
  }
  
  // Create user with is_approved: false
  // Send verification email
}
