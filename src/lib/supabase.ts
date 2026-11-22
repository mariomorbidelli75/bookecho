import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Client Supabase lato browser: account, profilo e amici lettori.
// Se le variabili non sono impostate l'app continua a funzionare in locale,
// ma la parte amici/registrazione mostra un avviso.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
    : null

export const isCloudReady = supabase !== null
