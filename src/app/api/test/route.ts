import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'API routes are working!',
    timestamp: new Date().toISOString(),
    url: request.url
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  
  return NextResponse.json({
    message: 'POST request received',
    timestamp: new Date().toISOString(),
    body: body
  })
} 