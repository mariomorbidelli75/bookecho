'use client'
import { supabase } from '@/lib/supabase'

// fetch verso le API dell'app con il "pass" dell'utente collegato.
// Se si supera il limite giornaliero o la sessione è scaduta, lo dice chiaramente.
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  if (supabase) {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }
  const res = await fetch(input, { ...init, headers })
  if (res.status === 429 || res.status === 401) {
    try {
      const { error } = await res.clone().json()
      if (error) alert(error)
    } catch {}
  }
  return res
}
