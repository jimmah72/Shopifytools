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

  // Find the actual header row (skip title rows)
  let headerRowIndex = -1
  let headers: string[] = []
  
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const potentialHeaders = lines[i].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase())
    console.log(`Row ${i} contents:`, potentialHeaders)
    
    // Look for a row that contains expected column names
    if (platform === 'google_ads') {
      if (potentialHeaders.some(h => h.includes('campaign')) && 
          potentialHeaders.some(h => h.includes('day') || h.includes('date')) && 
          potentialHeaders.some(h => h.includes('cost'))) {
        headerRowIndex = i
        headers = potentialHeaders
        break
      }
    } else if (platform === 'facebook_ads') {
      if (potentialHeaders.some(h => h.includes('campaign name')) && 
          potentialHeaders.some(h => h.includes('day')) && 
          potentialHeaders.some(h => h.includes('amount spent'))) {
        headerRowIndex = i
        headers = potentialHeaders
        break
      }
    }
  }
  
  if (headerRowIndex === -1) {
    throw new Error('Could not find header row with expected columns')
  }
  
  console.log(`Found headers at row ${headerRowIndex}:`, headers)
  
  // Find column indices based on platform
  let dateIndex = -1
  let spendIndex = -1
  let campaignIndex = -1

  if (platform === 'google_ads') {
    // Look for exact matches first, then partial matches
    dateIndex = headers.findIndex(h => h === 'day')
    if (dateIndex === -1) dateIndex = headers.findIndex(h => h.includes('day') || h.includes('date'))
    
    spendIndex = headers.findIndex(h => h === 'cost')
    if (spendIndex === -1) spendIndex = headers.findIndex(h => h.includes('cost') || h.includes('spend'))
    
    campaignIndex = headers.findIndex(h => h === 'campaign')
    if (campaignIndex === -1) campaignIndex = headers.findIndex(h => h.includes('campaign'))
    
    console.log(`Google Ads column indices - Day: ${dateIndex}, Cost: ${spendIndex}, Campaign: ${campaignIndex}`)
  } else if (platform === 'facebook_ads') {
    dateIndex = headers.findIndex(h => h.includes('day'))
    if (dateIndex === -1) dateIndex = headers.findIndex(h => h.includes('date'))
    
    spendIndex = headers.findIndex(h => h.includes('amount spent'))
    if (spendIndex === -1) spendIndex = headers.findIndex(h => h.includes('spend'))
    
    campaignIndex = headers.findIndex(h => h.includes('campaign name'))
    if (campaignIndex === -1) campaignIndex = headers.findIndex(h => h.includes('campaign'))
    
    console.log(`Facebook Ads column indices - Day: ${dateIndex}, Amount Spent: ${spendIndex}, Campaign: ${campaignIndex}`)
  }

  if (dateIndex === -1 || spendIndex === -1) {
    throw new Error(`Required columns not found. Expected: ${platform === 'google_ads' ? 'Day, Cost, Campaign' : 'Date, Amount Spent, Campaign Name'}`)
  }

  const rows: CSVRow[] = []

  // Process data rows (start after header row)
  for (let i = headerRowIndex + 1; i < lines.length; i++) {
    const row = lines[i].split(',').map(cell => cell.trim().replace(/"/g, ''))
    
    if (row.length <= Math.max(dateIndex, spendIndex, campaignIndex)) {
      continue // Skip incomplete rows
    }

    const rawDate = row[dateIndex]
    const rawSpend = row[spendIndex]
    const rawCampaign = campaignIndex >= 0 ? row[campaignIndex] : 'Unknown Campaign'

    // Skip Meta summary row (row 1 after headers) - it has empty campaign and shows totals
    if (platform === 'facebook_ads' && i === headerRowIndex + 1 && 
        (!rawCampaign || rawCampaign.trim() === '')) {
      console.log(`Skipping Meta summary row ${i}: Total spend ${rawSpend}`)
      continue
    }

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

    // Get the user's active store (first available store for now)
    const store = await prisma.store.findFirst()
    
    if (!store) {
      return NextResponse.json(
        { success: false, message: 'No active store found. Please connect your Shopify store first.' },
        { status: 404 }
      )
    }

    console.log(`Using store: ${store.name} (${store.domain}) - ID: ${store.id}`)

    // Check if this platform already has data for this store
    const existingAdSpend = await prisma.adSpend.findFirst({
      where: {
        storeId: store.id,
        platform: platform
      }
    })

    if (existingAdSpend) {
      console.log(`Found existing ${platform} data for store ${store.name}`)
      // TODO: Add validation to ensure data consistency if needed
    } else {
      console.log(`First import of ${platform} data for store ${store.name}`)
    }

    // Insert ad spend records (using only valid schema fields)
    const adSpendRecords = csvRows.map(row => ({
      storeId: store.id,
      platform: platform,
      amount: row.spend,
      date: new Date(row.date + 'T00:00:00.000Z'),
      campaign: row.campaign,
      description: `${platform} ad spend - ${row.campaign}`
    }))

    // Batch insert with duplicate handling
    const result = await prisma.adSpend.createMany({
      data: adSpendRecords as any,
      skipDuplicates: true
    })

    console.log(`Successfully inserted ${result.count} ad spend records for ${platform}`)

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${result.count} ad spend records from ${platform} for store ${store.name}`,
      recordCount: result.count,
      store: {
        name: store.name,
        domain: store.domain
      }
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