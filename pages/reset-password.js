// pages/reset-password.js
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
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
    let token = router.query.access_token
    let type = router.query.type

    if (typeof window !== 'undefined' && window.location.hash) {
      const params = new URLSearchParams(window.location.hash.slice(1))
      if (params.get('error')) {
        setErrorInfo({ description: params.get('error_description') || 'Link invalid or expired.' })
        return
      }
      if (!token) token = params.get('access_token')
      if (!type) type = params.get('type')
    }

    if (token && (type === 'recovery' || !type)) {
      setReady(true)
      setMsg('')
      setErrorInfo(null)
    } else if (!errorInfo) {
      setMsg('Invalid or missing reset token.')
    }
  }, [router.isReady, router.query, errorInfo])

  const onSubmit = async (e) => {
    e.preventDefault()
    if (newPw.length < 6) return setMsg('Password must be ≥6 characters.')
    if (newPw !== confirmPw) return setMsg('Passwords do not match.')
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPw })
    setLoading(false)
    if (error) return setMsg(`Error: ${error.message}`)
    setMsg('Password updated. Redirecting…')
    setTimeout(() => router.push('/login'), 1500)
  }

  if (errorInfo) {
    return (
      <div style={{ padding: '2rem', maxWidth: 480, margin: 'auto' }}>
        <h1>Reset Password</h1>
        <p style={{ color: 'red' }}>{errorInfo.description}</p>
        <p>
          <a href="/forgot-password">Request new reset link</a>
        </p>
      </div>
    )
  }

  if (!ready) {
    return (
      <div style={{ padding: '2rem', maxWidth: 480, margin: 'auto' }}>
        <h1>Reset Password</h1>
        {msg && <p style={{ color: 'red' }}>{msg}</p>}
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 480, margin: 'auto' }}>
      <h1>Reset Password</h1>
      <form onSubmit={onSubmit}>
        <input
          type="password"
          placeholder="New password"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
          required
          minLength={6}
          style={{ display: 'block', width: '100%', padding: 8, marginBottom: 12 }}
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPw}
          onChange={(e) => setConfirmPw(e.target.value)}
          required
          minLength={6}
          style={{ display: 'block', width: '100%', padding: 8, marginBottom: 12 }}
        />
        <button type="submit" disabled={loading} style={{ padding: '0.75rem 1.5rem' }}>
          {loading ? 'Updating…' : 'Reset Password'}
        </button>
      </form>
      {msg && <p style={{ marginTop: 12, color: msg.startsWith('Error') ? 'red' : 'green' }}>{msg}</p>}
    </div>
  )
}
