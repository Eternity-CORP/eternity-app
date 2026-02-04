import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Lazy initialization to handle SSG/build time
let _supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  _supabase = createClient(supabaseUrl, supabaseKey)
  return _supabase
}

// Export getter for use in components
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return getSupabase()[prop as keyof SupabaseClient]
  },
})

// Username functions
export async function lookupUsername(username: string): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from('usernames')
    .select('address')
    .eq('username', username.toLowerCase())
    .single()

  if (error || !data) return null
  return data.address
}

export async function lookupAddressByUsername(address: string): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from('usernames')
    .select('username')
    .eq('address', address.toLowerCase())
    .single()

  if (error || !data) return null
  return data.username
}

export async function registerUsername(address: string, username: string): Promise<boolean> {
  const { error } = await getSupabase()
    .from('usernames')
    .insert({ address: address.toLowerCase(), username: username.toLowerCase() })

  return !error
}

// Transaction types and functions
export interface Transaction {
  id: string
  hash: string
  from_address: string
  to_address: string
  amount: string
  token_symbol: string
  status: 'pending' | 'confirmed' | 'failed'
  direction: 'sent' | 'received'
  created_at: string
}

export async function saveTransaction(tx: Omit<Transaction, 'id' | 'created_at'>): Promise<boolean> {
  const { error } = await getSupabase().from('transactions').insert(tx)
  return !error
}

export async function getTransactions(address: string, limit = 20): Promise<Transaction[]> {
  const lowerAddress = address.toLowerCase()

  const { data, error } = await getSupabase()
    .from('transactions')
    .select('*')
    .or(`from_address.eq.${lowerAddress},to_address.eq.${lowerAddress}`)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return data
}
