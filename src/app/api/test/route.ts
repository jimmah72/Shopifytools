import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    console.log('Test API route called')
    
    return NextResponse.json({
      message: 'API routes are working!',
      timestamp: new Date().toISOString(),
      url: request.url,
      environment: process.env.NODE_ENV
    })
  } catch (error) {
    console.error('Test API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    
    return NextResponse.json({
      message: 'POST request received',
      timestamp: new Date().toISOString(),
      body: body
    })
  } catch (error) {
    console.error('Test API POST error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 