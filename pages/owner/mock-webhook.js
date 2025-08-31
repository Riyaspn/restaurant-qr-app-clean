// pages/owner/mock-webhook.js
import React, { useState } from 'react'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'

const options = [
  { label: 'Swiggy Webhook', value: 'swiggy' },
  { label: 'Zomato Webhook', value: 'zomato' }
]

export default function MockWebhook() {
  const [selected, setSelected] = useState('swiggy')
  const [payload, setPayload] = useState('{}')
  const [response, setResponse] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const sendWebhook = async () => {
    setError(null)
    setResponse(null)
    setLoading(true)
    try {
      const parsedPayload = JSON.parse(payload)
      const res = await fetch(`/api/integrations/${selected}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedPayload)
      })
      const text = await res.text()
      if (!res.ok) {
        setError(`HTTP ${res.status}: ${text}`)
      } else {
        setResponse(`Success: ${text}`)
      }
    } catch (e) {
      setError(`Invalid JSON: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mock-webhook-page">
      <h1>Mock Webhook Tester</h1>
      <Card padding={24}>
        <label>
          Select Webhook Endpoint:
          <select value={selected} onChange={e => setSelected(e.target.value)}>
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label>
          JSON Payload:
          <textarea
            rows={15}
            style={{ width: '100%', fontFamily: 'monospace', fontSize: 14 }}
            value={payload}
            onChange={e => setPayload(e.target.value)}
            placeholder={`Enter JSON payload to simulate the ${selected} webhook`}
          />
        </label>
        <Button disabled={loading} onClick={sendWebhook}>
          {loading ? 'Sending...' : 'Send Mock Webhook'}
        </Button>
        {response && <pre style={{ marginTop: 12, color: 'green' }}>{response}</pre>}
        {error && <pre style={{ marginTop: 12, color: 'red' }}>{error}</pre>}
      </Card>
      <style jsx>{`
        .mock-webhook-page {
          max-width: 800px;
          margin: 2rem auto;
          padding: 0 1rem;
        }
        label {
          display: block;
          margin-bottom: 1rem;
          font-weight: 600;
        }
        select, textarea {
          margin-top: 0.3rem;
          padding: 0.4rem;
          font-size: 1rem;
          width: 100%;
          box-sizing: border-box;
          border-radius: 4px;
          border: 1px solid #ccc;
        }
      `}</style>
    </div>
  )
}
