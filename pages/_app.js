
import '../styles/responsive.css'
import '../styles/globals.css'
import Layout from '../components/Layout'
import { RestaurantProvider } from '../context/RestaurantContext'

function MyApp({ Component, pageProps }) {
  return (
    <RestaurantProvider>
      <Layout title={pageProps.title}>
        <Component {...pageProps} />
      </Layout>
    </RestaurantProvider>
  )
}
export default MyApp
