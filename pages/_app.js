import '../styles/globals.css'  // your global CSS or Tailwind import
import Layout from '../components/Layout'

function MyApp({ Component, pageProps }) {
  return (
    <Layout title={pageProps.title}>
      <Component {...pageProps} />
    </Layout>
  )
}

export default MyApp
