// File: pages/index.js
import Link from 'next/link'

export default function Home() {
  return (
    <div style={{ textAlign: 'center', padding: '100px 20px' }}>
      <h1>Welcome to Your Restaurant QR App</h1>
      <p>Restaurant owners can <Link href="/login">log in</Link> or <Link href="/signup">sign up</Link>.</p>
    </div>
  )
}
