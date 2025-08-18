import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '../services/supabase'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMsg('')
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    setLoading(false)
    if (error) {
      setMsg(`Error: ${error.message}`)
    } else {
      setMsg('If this email exists, a reset link has been sent. Please check your inbox and spam.')
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', padding: 20 }}>
      <h1>Forgot Password</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ display: 'block', width: '100%', marginBottom: 10, padding: 8 }}
        />
        <button disabled={loading} style={{ padding: '10px 20px', marginBottom: 10 }}>
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      {msg && (
        <div style={{
          padding: 10,
          backgroundColor: msg.startsWith('Error') ? '#ffe6e6' : '#e6ffe6',
          border: '1px solid ' + (msg.startsWith('Error') ? '#ff0000' : '#00aa00'),
          borderRadius: 4,
          marginBottom: 10
        }}>{msg}</div>
      )}
      <p>
        Remembered it? <Link href="/login" style={{ color: '#0070f3', textDecoration: 'underline' }}>Login</Link>
      </p>
    </div>
  )
}
