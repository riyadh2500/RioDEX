import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Token } from '@/types/token'
import { getNativeToken, getWETHToken } from '@/config/tokens'
import { DEFAULT_CHAIN_ID } from '@/config/networks'

// Lazy — not instantiated at module load
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

export async function GET() {
  try {
    const { data, error } = await getSupabase()
      .from('tokens')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    const tokens: Token[] = (data ?? []).map((row: any) => ({
      address:   row.address,
      symbol:    row.symbol,
      name:      row.name,
      decimals:  row.decimals,
      logoURI:   row.logo_url ?? undefined,
      chainId:   row.chain_id ?? DEFAULT_CHAIN_ID,
      createdBy: row.created_by ?? undefined,
      createdAt: row.created_at,
    }))

    // Always prepend the native token and WETH so the UI always has them
    const native = getNativeToken(DEFAULT_CHAIN_ID)
    const weth   = getWETHToken(DEFAULT_CHAIN_ID)

    const allTokens = [native, ...(weth.address ? [weth] : []), ...tokens]

    return NextResponse.json(allTokens)
  } catch (err) {
    console.error('[GET /api/tokens]', err)
    // Graceful fallback: return built-in tokens so the UI is never blank
    return NextResponse.json([getNativeToken(DEFAULT_CHAIN_ID)])
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { address, symbol, name, decimals, logo_url, chain_id, created_by } = body

    if (!address || !symbol || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await getSupabase()
      .from('tokens')
      .upsert({
        address:   address.toLowerCase(),
        symbol,
        name,
        decimals:  decimals ?? 18,
        logo_url:  logo_url ?? null,
        chain_id:  chain_id ?? DEFAULT_CHAIN_ID,
        created_by: created_by ?? null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('[POST /api/tokens]', err)
    return NextResponse.json({ error: 'Failed to save token' }, { status: 500 })
  }
}
