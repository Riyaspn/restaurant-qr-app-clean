import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

const RestaurantContext = createContext(null)

export function RestaurantProvider({ children }) {
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const { data, error } = await supabase.from('my_restaurant').select('*').single()
      if (!mounted) return
      if (error) setError(error.message)
      setRestaurant(data || null)
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [])

  return (
    <RestaurantContext.Provider value={{ restaurant, loading, error }}>
      {children}
    </RestaurantContext.Provider>
  )
}

export function useRestaurant() {
  return useContext(RestaurantContext)
}
