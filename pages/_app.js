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

const CUSTOMER_PREFIX = '/order'

function MyApp({ Component, pageProps }) {
  const router = useRouter()
  const path = router.pathname || ''
  const showSidebar = OWNER_ROUTES.some(prefix => path.startsWith(prefix))
  const isCustomerRoute = path === CUSTOMER_PREFIX || path.startsWith(`${CUSTOMER_PREFIX}/`)

  return (
    <RestaurantProvider>
      <Layout 
        title={pageProps.title} 
        showSidebar={showSidebar}
        hideChrome={isCustomerRoute}
        showCustomerHeader={isCustomerRoute}
      >
        <Component {...pageProps} />
      </Layout>
    </RestaurantProvider>
  )
}

export default MyApp
