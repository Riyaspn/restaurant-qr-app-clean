import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../services/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    setLoading(false)

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        setMessage('Please check your email and click the confirmation link first.')
      } else {
        setMessage('Error: ' + error.message)
      }
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', padding: 20 }}>
      <h1>Restaurant Owner Login</h1>
      <form onSubmit={handleLogin}>
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
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ display: 'block', width: '100%', marginBottom: 10, padding: 8 }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '10px 20px', marginBottom: 10 }}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      
      {message && (
        <div style={{ 
          padding: 10, 
          backgroundColor: '#ffe6e6',
          border: '1px solid #ff0000',
          borderRadius: 4,
          marginBottom: 10
        }}>
          {message}
        </div>
      )}
      
      <p>Don&apos;t have an account? <Link href="/signup">Sign up here</Link></p>
    </div>
  )
}
