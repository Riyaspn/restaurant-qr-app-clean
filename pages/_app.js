// pages/_app.js
import '../styles/responsive.css'
import '../styles/globals.css'
import '../styles/theme.css'
import Layout from '../components/Layout'
import { RestaurantProvider } from '../context/RestaurantContext'
import { useRouter } from 'next/router'

const OWNER_PREFIX = '/owner'
const CUSTOMER_PREFIX = '/order'

function MyApp({ Component, pageProps }) {
  const router = useRouter()
  const path = router.pathname || ''

  const showSidebar = path === OWNER_PREFIX || path.startsWith(`${OWNER_PREFIX}/`)
  const isCustomerRoute = path === CUSTOMER_PREFIX || path.startsWith(`${CUSTOMER_PREFIX}/`)

  return (
    <RestaurantProvider>
      <Layout
        title={pageProps?.title}
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
