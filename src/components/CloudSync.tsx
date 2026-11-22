'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { syncLibrary } from '@/lib/cloud-books'

// Allinea la libreria del telefono con quella online all'apertura dell'app
// e subito dopo l'accesso. Se arrivano libri nuovi ricarica la pagina una volta,
// così le schermate li mostrano.
export function CloudSync() {
  useEffect(() => {
    if (!supabase) return
    const run = async () => {
      try {
        if (await syncLibrary()) window.location.reload()
      } catch {}
    }
    run()
    const { data } = supabase.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_IN') run() })
    const onOnline = () => run()
    window.addEventListener('online', onOnline)
    return () => { data.subscription.unsubscribe(); window.removeEventListener('online', onOnline) }
  }, [])
  return null
}
