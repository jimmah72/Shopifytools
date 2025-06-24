import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface CSVRow {
  date: string
  campaign: string
  spend: number
}

// Parse CSV content into structured data
function parseCSV(csvContent: string, platform: 'google_ads' | 'facebook_ads'): CSVRow[] {
  const lines = csvContent.split('\n').filter(line => line.trim())
  
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row')
  }

  // Get headers (first line)
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase())
  
  // Find column indices based on platform
  let dateIndex = -1
  let spendIndex = -1
  let campaignIndex = -1

  if (platform === 'google_ads') {
    dateIndex = headers.findIndex(h => h.includes('date') || h.includes('day'))
    spendIndex = headers.findIndex(h => h.includes('cost') || h.includes('spend'))
    campaignIndex = headers.findIndex(h => h.includes('campaign'))
  } else if (platform === 'facebook_ads') {
    dateIndex = headers.findIndex(h => h.includes('date') || h.includes('day'))
    spendIndex = headers.findIndex(h => h.includes('amount spent') || h.includes('spend'))
    campaignIndex = headers.findIndex(h => h.includes('campaign name') || h.includes('campaign'))
  }

  if (dateIndex === -1 || spendIndex === -1) {
    throw new Error(`Required columns not found. Expected: Date, ${platform === 'google_ads' ? 'Cost/Spend' : 'Amount Spent'}, Campaign`)
  }

  const rows: CSVRow[] = []

  // Process data rows (skip header)
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map(cell => cell.trim().replace(/"/g, ''))
    
    if (row.length <= Math.max(dateIndex, spendIndex, campaignIndex)) {
      continue // Skip incomplete rows
    }

    const rawDate = row[dateIndex]
    const rawSpend = row[spendIndex]
    const rawCampaign = campaignIndex >= 0 ? row[campaignIndex] : 'Unknown Campaign'

    // Parse spend amount
    const spendStr = rawSpend.replace(/[$,£€]/g, '').trim()
    const spend = parseFloat(spendStr)

    if (isNaN(spend) || spend < 0) {
      continue // Skip invalid spend amounts
    }

    // Parse date
    let formattedDate = ''
    try {
      const dateObj = new Date(rawDate)
      if (!isNaN(dateObj.getTime())) {
        formattedDate = dateObj.toISOString().split('T')[0] // YYYY-MM-DD
      } else {
        continue // Skip invalid dates
      }
    } catch (e) {
      continue // Skip invalid dates
    }

    rows.push({
      date: formattedDate,
      campaign: rawCampaign,
      spend: spend
    })
  }

  return rows
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const platform = formData.get('platform') as 'google_ads' | 'facebook_ads'

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file uploaded' },
        { status: 400 }
      )
    }

    if (!platform || !['google_ads', 'facebook_ads'].includes(platform)) {
      return NextResponse.json(
        { success: false, message: 'Invalid platform specified' },
        { status: 400 }
      )
    }

    // Read file content
    const csvContent = await file.text()
    
    // Parse CSV data
    const csvRows = parseCSV(csvContent, platform)

    if (csvRows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No valid data found in CSV file' },
        { status: 400 }
      )
    }

    // Get store (assuming single store for now)
    const store = await prisma.store.findFirst()
    
    if (!store) {
      return NextResponse.json(
        { success: false, message: 'No store found. Please connect your Shopify store first.' },
        { status: 404 }
      )
    }

    // Insert ad spend records
    const adSpendRecords = csvRows.map(row => ({
      storeId: store.id,
      platform: platform,
      amount: row.spend,
      date: new Date(row.date + 'T00:00:00.000Z'),
      campaign: row.campaign,
      description: `${platform} ad spend - ${row.campaign}`,
      accountId: `${platform}_csv_import`,
      lastSync: new Date()
    }))

    // Batch insert
    await prisma.adSpend.createMany({
      data: adSpendRecords,
      skipDuplicates: true
    })

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${csvRows.length} ad spend records from ${platform}`,
      recordCount: csvRows.length
    })

  } catch (error) {
    console.error('CSV upload error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to process CSV file',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      },
      { status: 500 }
    )
  }
} 