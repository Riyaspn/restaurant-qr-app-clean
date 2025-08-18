// pages/reset-password.js
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../services/supabase'

export default function ResetPassword() {
  const router = useRouter()
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [ready, setReady] = useState(false)
  const [errorInfo, setErrorInfo] = useState(null)

  useEffect(() => {
    if (!router.isReady) return

    // Try query first
    let token = router.query.access_token
    let type = router.query.type

    // Also parse hash fragment
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash
      const params = new URLSearchParams(hash)

      // If there is an explicit error, capture it
      const err = params.get('error')
      const errCode = params.get('error_code')
      const errDesc = params.get('error_description')
      if (err || errCode || errDesc) {
        setErrorInfo({
          error: err || '',
          code: errCode || '',
          description: errDesc || 'Link is invalid or expired.'
        })
        setReady(false)
        return
      }

      // Otherwise try to read token/type from hash
      if (!token) {
        const hashToken = params.get('access_token')
        if (hashToken) token = hashToken
      }
      if (!type) {
        const hashType = params.get('type')
        if (hashType) type = hashType
      }
    }

    if (token && (!type || type === 'recovery')) {
      setReady(true)
      setMsg('')
      setErrorInfo(null)
    } else if (!errorInfo) {
      setReady(false)
      setMsg('Invalid or missing password reset token.')
    }
  }, [router.isReady, router.query])

  const onSubmit = async (e) => {
    e.preventDefault()
    setMsg('')

    if (newPw.length < 6) {
      setMsg('Password must be at least 6 characters.')
      return
    }
    if (newPw !== confirmPw) {
      setMsg('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPw })
    setLoading(false)

    if (error) {
      setMsg(`Error updating password: ${error.message}`)
      return
    }

    setMsg('Password updated. Redirecting to login…')
    setTimeout(() => router.push('/login'), 2000)
  }

  // If Supabase reported a specific error (e.g., otp_expired)
  if (errorInfo) {
    const isExpired = errorInfo.code === 'otp_expired'
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: 20 }}>
        <h1>Password Reset</h1>
        <div style={{
          padding: 12,
          backgroundColor: '#ffe6e6',
          border: '1px solid #ff0000',
          borderRadius: 4,
          marginBottom: 12
        }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            {isExpired ? 'This reset link has expired.' : 'Unable to reset password.'}
          </div>
          <div style={{ marginBottom: 8 }}>
            {errorInfo.description || 'The link is invalid or has expired.'}
          </div>
          <div>
            Please request a new reset link from{' '}
            <Link href="/forgot-password" style={{ color: '#0070f3', textDecoration: 'underline' }}>
              Forgot Password
            </Link>.
          </div>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div style={{ maxWidth: 400, margin: '0 auto', padding: 20 }}>
        <h1>Password Reset</h1>
        {msg && <p style={{ color: 'red' }}>{msg}</p>}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', padding: 20 }}>
      <h1>Password Reset</h1>
      <form onSubmit={onSubmit}>
        <input
          type="password"
          placeholder="New password"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
          minLength={6}
          required
          style={{ display: 'block', width: '100%', marginBottom: 10, padding: 8 }}
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPw}
          onChange={(e) => setConfirmPw(e.target.value)}
          minLength={6}
          required
          style={{ display: 'block', width: '100%', marginBottom: 10, padding: 8 }}
        />
        <button disabled={loading} style={{ padding: '10px 20px', marginBottom: 10 }}>
          {loading ? 'Updating…' : 'Reset password'}
        </button>
      </form>

      {msg && (
        <div style={{
          padding: 10,
          backgroundColor: msg.startsWith('Error') ? '#ffe6e6' : '#e6ffe6',
          border: '1px solid ' + (msg.startsWith('Error') ? '#ff0000' : '#00aa00'),
          borderRadius: 4,
          marginBottom: 10
        }}>
          {msg}
        </div>
      )}
    </div>
  )
}
