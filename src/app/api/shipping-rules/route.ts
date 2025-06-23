import { NextRequest, NextResponse } from 'next/server'

// Mark route as dynamic
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// DISABLED: Shipping rules functionality was removed from settings
// These endpoints return empty/success responses to prevent build errors

export async function GET(request: NextRequest) {
  return NextResponse.json([])
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ success: true, message: 'Shipping rules functionality disabled' })
}

export async function PUT(request: NextRequest) {
  return NextResponse.json({ success: true, message: 'Shipping rules functionality disabled' })
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json({ success: true, message: 'Shipping rules functionality disabled' })
} 