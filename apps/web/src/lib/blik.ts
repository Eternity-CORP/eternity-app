import type { SupabaseClient } from '@supabase/supabase-js'

export interface BlikCode {
  id: string
  code: string
  receiver_address: string
  receiver_username: string | null
  sender_address: string | null
  amount: string
  token_symbol: string
  status: 'active' | 'pending' | 'completed' | 'expired'
  tx_hash: string | null
  network: string | null
  expires_at: string
  created_at: string
}

// Lazy import to avoid build-time issues
let supabasePromise: Promise<{ supabase: SupabaseClient }> | null = null

async function getSupabase(): Promise<SupabaseClient> {
  if (!supabasePromise) {
    supabasePromise = import('./supabase')
  }
  const mod = await supabasePromise
  return mod.supabase
}

// Generate 6-digit code
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Create BLIK code for receiving payment
export async function createBlikCode(
  receiverAddress: string,
  amount: string,
  tokenSymbol: string = 'ETH',
  receiverUsername?: string
): Promise<BlikCode | null> {
  const supabase = await getSupabase()
  const code = generateCode()
  const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString() // 2 minutes

  const { data, error } = await supabase
    .from('blik_codes')
    .insert({
      code,
      receiver_address: receiverAddress.toLowerCase(),
      receiver_username: receiverUsername || null,
      amount,
      token_symbol: tokenSymbol,
      status: 'active',
      expires_at: expiresAt,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create BLIK code:', error)
    return null
  }

  return data
}

// Lookup BLIK code (for sender)
export async function lookupBlikCode(code: string): Promise<BlikCode | null> {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('blik_codes')
    .select('*')
    .eq('code', code)
    .in('status', ['active', 'pending'])
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error || !data) return null
  return data
}

// Update BLIK code status
export async function updateBlikStatus(
  id: string,
  status: 'active' | 'pending' | 'completed' | 'expired'
): Promise<boolean> {
  const supabase = await getSupabase()
  const { error } = await supabase
    .from('blik_codes')
    .update({ status })
    .eq('id', id)

  return !error
}

// Confirm BLIK payment (mark as completed with transaction details)
export async function confirmBlikPayment(
  code: string,
  senderAddress: string,
  txHash: string,
  network: string
): Promise<BlikCode | null> {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('blik_codes')
    .update({
      status: 'completed',
      sender_address: senderAddress.toLowerCase(),
      tx_hash: txHash,
      network,
    })
    .eq('code', code)
    .in('status', ['active', 'pending'])
    .gt('expires_at', new Date().toISOString())
    .select()
    .single()

  if (error || !data) {
    console.error('Failed to confirm BLIK payment:', error)
    return null
  }

  return data
}

// Cancel BLIK code (only by owner)
export async function cancelBlikCode(
  code: string,
  receiverAddress: string
): Promise<boolean> {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('blik_codes')
    .delete()
    .eq('code', code)
    .eq('receiver_address', receiverAddress.toLowerCase())
    .in('status', ['active', 'pending'])
    .select()
    .single()

  return !error && !!data
}

// Subscribe to BLIK code updates (for real-time notifications)
export async function subscribeToBlikCode(
  codeId: string,
  onUpdate: (code: BlikCode) => void
) {
  const supabase = await getSupabase()
  return supabase
    .channel(`blik:${codeId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'blik_codes',
        filter: `id=eq.${codeId}`,
      },
      (payload) => {
        onUpdate(payload.new as BlikCode)
      }
    )
    .subscribe()
}

// Subscribe to any BLIK codes for a receiver address
export async function subscribeToBlikCodesForReceiver(
  receiverAddress: string,
  onUpdate: (code: BlikCode) => void
) {
  const supabase = await getSupabase()
  return supabase
    .channel(`blik:receiver:${receiverAddress.toLowerCase()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'blik_codes',
        filter: `receiver_address=eq.${receiverAddress.toLowerCase()}`,
      },
      (payload) => {
        onUpdate(payload.new as BlikCode)
      }
    )
    .subscribe()
}
