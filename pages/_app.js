// pages/_app.js
import '../styles/responsive.css'
import '../styles/globals.css'
import Layout from '../components/Layout'
import { RestaurantProvider } from '../context/RestaurantContext'
import { useRouter } from 'next/router'

const OWNER_ROUTES = [
  '/dashboard',
  '/menu',
  '/orders',
  '/availability',
  '/promotions',
  '/analytics',
  '/settings',
  '/billing'
]

function MyApp({ Component, pageProps }) {
  const router = useRouter()
  const showSidebar = OWNER_ROUTES.some(prefix => router.pathname.startsWith(prefix))

  return (
    <RestaurantProvider>
      <Layout title={pageProps.title} showSidebar={showSidebar}>
        <Component {...pageProps} />
      </Layout>
    </RestaurantProvider>
  )
}

export default MyApp
