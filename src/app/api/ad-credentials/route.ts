import { NextRequest, NextResponse } from 'next/server'
import { writeFile, readFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  try {
    const { platform, credentials } = await request.json()

    if (!platform || !credentials) {
      return NextResponse.json(
        { error: 'Platform and credentials are required' },
        { status: 400 }
      )
    }

    // Create credentials directory if it doesn't exist
    const credentialsDir = join(process.cwd(), 'credentials')
    if (!existsSync(credentialsDir)) {
      await mkdir(credentialsDir, { recursive: true })
    }

    // Save credentials to a secure file (in production, use proper encryption)
    const filePath = join(credentialsDir, `${platform}-credentials.json`)
    
    const credentialData = {
      platform,
      credentials,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await writeFile(filePath, JSON.stringify(credentialData, null, 2))

    return NextResponse.json({ 
      success: true, 
      message: `${platform} credentials saved successfully` 
    })

  } catch (error) {
    console.error('Error saving credentials:', error)
    return NextResponse.json(
      { error: 'Failed to save credentials' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform')

    if (!platform) {
      return NextResponse.json(
        { error: 'Platform parameter is required' },
        { status: 400 }
      )
    }

    const filePath = join(process.cwd(), 'credentials', `${platform}-credentials.json`)
    
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Credentials not found for this platform' },
        { status: 404 }
      )
    }

    const credentialData = JSON.parse(await readFile(filePath, 'utf-8'))
    
    // Return only metadata, not the actual credentials for security
    return NextResponse.json({
      platform: credentialData.platform,
      hasCredentials: true,
      createdAt: credentialData.createdAt,
      updatedAt: credentialData.updatedAt
    })

  } catch (error) {
    console.error('Error reading credentials:', error)
    return NextResponse.json(
      { error: 'Failed to read credentials' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform')

    if (!platform) {
      return NextResponse.json(
        { error: 'Platform parameter is required' },
        { status: 400 }
      )
    }

    const filePath = join(process.cwd(), 'credentials', `${platform}-credentials.json`)
    
    if (existsSync(filePath)) {
      const { unlink } = await import('fs/promises')
      await unlink(filePath)
    }

    return NextResponse.json({ 
      success: true, 
      message: `${platform} credentials deleted successfully` 
    })

  } catch (error) {
    console.error('Error deleting credentials:', error)
    return NextResponse.json(
      { error: 'Failed to delete credentials' },
      { status: 500 }
    )
  }
} 