import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../services/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })

    setLoading(false)

    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage('Success! Please check your email and click the confirmation link before logging in.')
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', padding: 20 }}>
      <h1>Restaurant Owner Signup</h1>
      <form onSubmit={handleSignup}>
        <input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ display: 'block', width: '100%', marginBottom: 10, padding: 8 }}
        />
        <input
          type="password"
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          style={{ display: 'block', width: '100%', marginBottom: 10, padding: 8 }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '10px 20px', marginBottom: 10 }}
        >
          {loading ? 'Signing up...' : 'Sign Up'}
        </button>
      </form>
      
      {message && (
        <div style={{ 
          padding: 10, 
          backgroundColor: message.startsWith('Error') ? '#ffe6e6' : '#e6ffe6',
          border: '1px solid ' + (message.startsWith('Error') ? '#ff0000' : '#00aa00'),
          borderRadius: 4
        }}>
          {message}
        </div>
      )}
      
      <p>Already have an account? <Link href="/login">Login here</Link></p>
    </div>
  )
}
