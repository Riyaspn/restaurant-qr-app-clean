// lib/useRequireAuth.js
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../services/supabase'

export function useRequireAuth({ redirectTo = '/login' } = {}) {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let mounted = true

    const init = async () => {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return

      if (!data.session) {
        // not logged in → redirect
        router.replace(redirectTo + `?next=${encodeURIComponent(router.asPath)}`)
        setChecking(false)
        return
      }

      setChecking(false)
    }

    init()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace(redirectTo + `?next=${encodeURIComponent(router.asPath)}`)
      }
    })

    return () => {
      mounted = false
      listener.subscription?.unsubscribe()
    }
  }, [router, redirectTo])

  return { checking }
}
