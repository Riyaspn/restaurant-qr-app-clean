// components/Layout.js
import Head from 'next/head'
import Shell from './Shell'

export default function Layout({ children, title = 'Cafe QR', noChrome = false }) {
  return (
    <>
      <Head>
        <title>{title} | Cafe QR</title>
        <meta name="description" content="Contactless QR ordering and payments for cafes & restaurants" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {!noChrome ? <Shell>{children}</Shell> : <main className="app-main app-main--plain">{children}</main>}
    </>
  )
}
