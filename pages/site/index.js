export default function PublicHome() {
  return (
    <main style={{
      maxWidth: 800,
      margin: '40px auto',
      padding: 24,
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h1 style={{ marginTop: 0 }}>
        Café QR — Digital Menu & Ordering
      </h1>
      <p>Scan, order, and pay directly from your table.</p>

      <h3>Live Demo</h3>
      <p>
        <a href="/order?r=5c712271-3fb0-4160-8972-0d8aa5a66dd2&t=1">
          Start Order (Table 1)
        </a>
      </p>

      <h3>Support</h3>
      <p>
        Email: pnriyas50@gmail.com<br/>
        Phone: +91-7012120844
      </p>
      <p>Address: Puthenveetil (H), Menachery Gardens, Nellangara, Ollukara P.O, Thrissur, Kerala, India</p>

      <h3>Legal</h3>
      <ul>
        <li><a href="/legal/terms">Terms & Conditions</a></li>
        <li><a href="/pages/privacy-policy.js">Privacy Policy</a></li>
        <li><a href="/legal/refund">Refund & Cancellation</a></li>
      </ul>
    </main>
  )
}
