import { NextRequest, NextResponse } from 'next/server'

// Supabase configuration
const SUPABASE_URL = 'https://***REDACTED_SUPABASE_HOST***'
const SUPABASE_ANON_KEY = '***REDACTED_SUPABASE_ANON_KEY***'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, isBetaTester } = body

    // Validate email
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Insert into Supabase
    const response = await fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        is_beta_tester: Boolean(isBetaTester),
        source: 'website',
      }),
    })

    // Handle duplicate email (unique constraint violation)
    if (response.status === 409) {
      return NextResponse.json({
        success: true,
        message: 'Email already registered',
        isNew: false,
      })
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Supabase error:', response.status, errorText)
      
      // Check if it's a duplicate key error
      if (errorText.includes('duplicate') || errorText.includes('unique')) {
        return NextResponse.json({
          success: true,
          message: 'Email already registered',
          isNew: false,
        })
      }
      
      return NextResponse.json(
        { error: 'Failed to join waitlist' },
        { status: 500 }
      )
    }

    const data = await response.json()
    console.log('Waitlist entry created:', email)

    return NextResponse.json({
      success: true,
      message: 'Successfully joined waitlist',
      isNew: true,
      entry: {
        email: data[0]?.email,
        isBetaTester: data[0]?.is_beta_tester,
      },
    }, { status: 201 })

  } catch (error) {
    console.error('Waitlist error:', error)
    return NextResponse.json(
      { error: 'Failed to join waitlist' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    
    // Simple admin token check
    const adminToken = process.env.ADMIN_TOKEN || 'eternity-admin-2026'
    
    if (token !== adminToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch from Supabase (requires service_role key for reading, using anon for now)
    const response = await fetch(`${SUPABASE_URL}/rest/v1/waitlist?select=*&order=created_at.desc`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch waitlist' },
        { status: 500 }
      )
    }

    const data = await response.json()
    
    return NextResponse.json({
      count: data.length,
      entries: data,
    })

  } catch (error) {
    console.error('Waitlist fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch waitlist' },
      { status: 500 }
    )
  }
}
