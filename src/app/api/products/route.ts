import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

interface TransformedProduct {
  id: string
  title: string
  price: number
  cost: number
  totalSales: number
  totalRevenue: number
  totalProfit: number
  profitMargin: number
  adSpend: number
  netProfit: number
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = 10
    const search = searchParams.get('search') || ''
    const sortField = searchParams.get('sortField') || 'totalProfit'
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'
    const offset = (page - 1) * limit

    // Build search condition
    const searchCondition = search
      ? `AND (p.title ILIKE ${Prisma.sql`%${search}%`} OR p.sku ILIKE ${Prisma.sql`%${search}%`})`
      : ''

    // Get total count for pagination
    const totalResult = await prisma.$queryRaw<[{ count: number }]>`
      SELECT COUNT(*)::integer
      FROM "Product" p
      WHERE 1=1 ${Prisma.sql([searchCondition])}
    `
    const total = totalResult[0].count
    const totalPages = Math.ceil(total / limit)

    // Fetch products with aggregated data
    const products = await prisma.$queryRaw<TransformedProduct[]>`
      WITH ProductMetrics AS (
        SELECT
          p.id,
          p.title,
          p.price,
          p.cost,
          COALESCE(SUM(o.quantity), 0) as "totalSales",
          COALESCE(SUM(o.price * o.quantity), 0) as "totalRevenue",
          COALESCE(SUM(o.cost * o.quantity), 0) as "totalCost",
          COALESCE(SUM(o.adSpend), 0) as "adSpend"
        FROM "Product" p
        LEFT JOIN "Order" o ON o."productId" = p.id
        WHERE 1=1 ${Prisma.sql([searchCondition])}
        GROUP BY p.id, p.title, p.price, p.cost
      )
      SELECT
        id,
        title,
        price,
        cost,
        "totalSales",
        "totalRevenue",
        "totalRevenue" - "totalCost" as "totalProfit",
        CASE
          WHEN "totalRevenue" > 0
          THEN (("totalRevenue" - "totalCost" - "adSpend") / "totalRevenue" * 100)
          ELSE 0
        END as "profitMargin",
        "adSpend",
        "totalRevenue" - "totalCost" - "adSpend" as "netProfit"
      FROM ProductMetrics
      ORDER BY
        CASE WHEN ${Prisma.sql`${sortField}`} = 'totalProfit' AND ${Prisma.sql`${sortOrder}`} = 'desc' THEN "totalProfit" END DESC,
        CASE WHEN ${Prisma.sql`${sortField}`} = 'totalProfit' AND ${Prisma.sql`${sortOrder}`} = 'asc' THEN "totalProfit" END ASC,
        CASE WHEN ${Prisma.sql`${sortField}`} = 'netProfit' AND ${Prisma.sql`${sortOrder}`} = 'desc' THEN "netProfit" END DESC,
        CASE WHEN ${Prisma.sql`${sortField}`} = 'netProfit' AND ${Prisma.sql`${sortOrder}`} = 'asc' THEN "netProfit" END ASC,
        CASE WHEN ${Prisma.sql`${sortField}`} = 'totalRevenue' AND ${Prisma.sql`${sortOrder}`} = 'desc' THEN "totalRevenue" END DESC,
        CASE WHEN ${Prisma.sql`${sortField}`} = 'totalRevenue' AND ${Prisma.sql`${sortOrder}`} = 'asc' THEN "totalRevenue" END ASC,
        CASE WHEN ${Prisma.sql`${sortField}`} = 'totalSales' AND ${Prisma.sql`${sortOrder}`} = 'desc' THEN "totalSales" END DESC,
        CASE WHEN ${Prisma.sql`${sortField}`} = 'totalSales' AND ${Prisma.sql`${sortOrder}`} = 'asc' THEN "totalSales" END ASC,
        CASE WHEN ${Prisma.sql`${sortField}`} = 'profitMargin' AND ${Prisma.sql`${sortOrder}`} = 'desc' THEN "profitMargin" END DESC,
        CASE WHEN ${Prisma.sql`${sortField}`} = 'profitMargin' AND ${Prisma.sql`${sortOrder}`} = 'asc' THEN "profitMargin" END ASC,
        CASE WHEN ${Prisma.sql`${sortField}`} = 'adSpend' AND ${Prisma.sql`${sortOrder}`} = 'desc' THEN "adSpend" END DESC,
        CASE WHEN ${Prisma.sql`${sortField}`} = 'adSpend' AND ${Prisma.sql`${sortOrder}`} = 'asc' THEN "adSpend" END ASC,
        CASE WHEN ${Prisma.sql`${sortField}`} = 'price' AND ${Prisma.sql`${sortOrder}`} = 'desc' THEN price END DESC,
        CASE WHEN ${Prisma.sql`${sortField}`} = 'price' AND ${Prisma.sql`${sortOrder}`} = 'asc' THEN price END ASC,
        CASE WHEN ${Prisma.sql`${sortField}`} = 'cost' AND ${Prisma.sql`${sortOrder}`} = 'desc' THEN cost END DESC,
        CASE WHEN ${Prisma.sql`${sortField}`} = 'cost' AND ${Prisma.sql`${sortOrder}`} = 'asc' THEN cost END ASC,
        CASE WHEN ${Prisma.sql`${sortField}`} = 'title' AND ${Prisma.sql`${sortOrder}`} = 'desc' THEN title END DESC,
        CASE WHEN ${Prisma.sql`${sortField}`} = 'title' AND ${Prisma.sql`${sortOrder}`} = 'asc' THEN title END ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `

    return NextResponse.json({
      products,
      totalPages,
      currentPage: page,
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
} 