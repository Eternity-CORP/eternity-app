import { NextRequest, NextResponse } from 'next/server'

// Backend API URL
const API_URL = process.env.API_URL || 'http://localhost:3000'

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

    // Forward to backend API
    const apiUrl = `${API_URL}/waitlist`
    console.log('Calling API:', apiUrl)

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': request.headers.get('x-forwarded-for') || '',
        'x-real-ip': request.headers.get('x-real-ip') || '',
        'user-agent': request.headers.get('user-agent') || '',
      },
      body: JSON.stringify({
        email,
        isBetaTester: Boolean(isBetaTester),
        source: 'website',
      }),
    })

    const text = await response.text()
    console.log('API response status:', response.status)
    console.log('API response body:', text.substring(0, 200))

    if (!response.ok) {
      try {
        const errorData = JSON.parse(text)
        return NextResponse.json(
          { error: errorData.message || 'Failed to join waitlist' },
          { status: response.status }
        )
      } catch {
        return NextResponse.json(
          { error: 'API returned non-JSON response' },
          { status: response.status }
        )
      }
    }

    const data = JSON.parse(text)
    return NextResponse.json(data, { status: data.isNew ? 201 : 200 })
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

    // Forward to backend API
    const response = await fetch(`${API_URL}/waitlist?token=${token}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Unauthorized' },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Waitlist fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch waitlist' },
      { status: 500 }
    )
  }
}
