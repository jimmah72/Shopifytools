import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

interface ProfitMetrics {
  totalRevenue: number
  totalCost: number
  grossProfit: number
  netProfit: number
  totalOrders: number
  totalProductsSold: number
  adSpend: number
  profitMargin: number
}

interface TimeSeriesData {
  date: string
  revenue: number
  cost: number
  adSpend: number
  profit: number
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || '7d'
    
    // Calculate date range
    const now = new Date()
    const startDate = new Date(now)
    switch (period) {
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1)
        break
      default: // 7d
        startDate.setDate(now.getDate() - 7)
    }

    // Get the first store (for now, later we'll handle multi-store)
    const store = await prisma.store.findFirst()
    if (!store) {
      return NextResponse.json(
        { error: 'No store found' },
        { status: 404 }
      )
    }

    // Get aggregated metrics
    const metrics = await prisma.$queryRaw<ProfitMetrics[]>`
      WITH OrderMetrics AS (
        SELECT
          COALESCE(SUM(o.price * o.quantity), 0) as "totalRevenue",
          COALESCE(SUM(o.cost * o.quantity), 0) as "totalCost",
          COALESCE(SUM(o.adSpend), 0) as "adSpend",
          COUNT(DISTINCT o.id) as "totalOrders",
          COALESCE(SUM(o.quantity), 0) as "totalProductsSold"
        FROM "Order" o
        WHERE 
          o."storeId" = ${store.id}
          AND o."createdAt" >= ${startDate}
          AND o."createdAt" <= ${now}
      )
      SELECT
        "totalRevenue",
        "totalCost",
        "totalRevenue" - "totalCost" as "grossProfit",
        "totalRevenue" - "totalCost" - "adSpend" as "netProfit",
        "totalOrders",
        "totalProductsSold",
        "adSpend",
        CASE
          WHEN "totalRevenue" > 0
          THEN (("totalRevenue" - "totalCost" - "adSpend") / "totalRevenue" * 100)
          ELSE 0
        END as "profitMargin"
      FROM OrderMetrics
    `

    // Get time series data for the chart
    const timeSeriesData = await prisma.$queryRaw<TimeSeriesData[]>`
      WITH RECURSIVE DateSeries AS (
        SELECT
          DATE_TRUNC('day', ${startDate}::timestamp) as date
        UNION ALL
        SELECT
          date + INTERVAL '1 day'
        FROM DateSeries
        WHERE date < DATE_TRUNC('day', ${now}::timestamp)
      ),
      DailyMetrics AS (
        SELECT
          DATE_TRUNC('day', o."createdAt") as date,
          SUM(o.price * o.quantity) as revenue,
          SUM(o.cost * o.quantity) as cost,
          SUM(o.adSpend) as "adSpend"
        FROM "Order" o
        WHERE 
          o."storeId" = ${store.id}
          AND o."createdAt" >= ${startDate}
          AND o."createdAt" <= ${now}
        GROUP BY DATE_TRUNC('day', o."createdAt")
      )
      SELECT
        TO_CHAR(d.date, 'YYYY-MM-DD') as date,
        COALESCE(m.revenue, 0) as revenue,
        COALESCE(m.cost, 0) as cost,
        COALESCE(m."adSpend", 0) as "adSpend",
        COALESCE(m.revenue - m.cost - m."adSpend", 0) as profit
      FROM DateSeries d
      LEFT JOIN DailyMetrics m ON d.date = m.date
      ORDER BY d.date
    `

    // Get top products by profit
    const topProducts = await prisma.$queryRaw`
      SELECT
        p.id,
        p.title,
        COALESCE(SUM(o.price * o.quantity), 0) as "totalRevenue",
        COALESCE(SUM(o.cost * o.quantity), 0) as "totalCost",
        COALESCE(SUM(o.price * o.quantity) - SUM(o.cost * o.quantity), 0) as "totalProfit",
        COALESCE(SUM(o.adSpend), 0) as "adSpend",
        CASE
          WHEN SUM(o.price * o.quantity) > 0
          THEN ((SUM(o.price * o.quantity) - SUM(o.cost * o.quantity) - SUM(o.adSpend)) / SUM(o.price * o.quantity) * 100)
          ELSE 0
        END as "profitMargin"
      FROM "Product" p
      LEFT JOIN "Order" o ON o."productId" = p.id
      WHERE 
        p."storeId" = ${store.id}
        AND (o."createdAt" >= ${startDate} OR o."createdAt" IS NULL)
        AND (o."createdAt" <= ${now} OR o."createdAt" IS NULL)
      GROUP BY p.id, p.title
      ORDER BY "totalProfit" DESC
      LIMIT 5
    `

    // Calculate period-over-period changes
    const previousStartDate = new Date(startDate)
    switch (period) {
      case '30d':
        previousStartDate.setDate(previousStartDate.getDate() - 30)
        break
      case '90d':
        previousStartDate.setDate(previousStartDate.getDate() - 90)
        break
      case '1y':
        previousStartDate.setFullYear(previousStartDate.getFullYear() - 1)
        break
      default: // 7d
        previousStartDate.setDate(previousStartDate.getDate() - 7)
    }

    const previousMetrics = await prisma.$queryRaw<ProfitMetrics[]>`
      SELECT
        COALESCE(SUM(o.price * o.quantity), 0) as "totalRevenue",
        COALESCE(SUM(o.cost * o.quantity), 0) as "totalCost",
        COALESCE(SUM(o.price * o.quantity) - SUM(o.cost * o.quantity), 0) as "grossProfit",
        COALESCE(SUM(o.price * o.quantity) - SUM(o.cost * o.quantity) - SUM(o.adSpend), 0) as "netProfit",
        COUNT(DISTINCT o.id) as "totalOrders",
        COALESCE(SUM(o.quantity), 0) as "totalProductsSold",
        COALESCE(SUM(o.adSpend), 0) as "adSpend",
        CASE
          WHEN SUM(o.price * o.quantity) > 0
          THEN ((SUM(o.price * o.quantity) - SUM(o.cost * o.quantity) - SUM(o.adSpend)) / SUM(o.price * o.quantity) * 100)
          ELSE 0
        END as "profitMargin"
      FROM "Order" o
      WHERE 
        o."storeId" = ${store.id}
        AND o."createdAt" >= ${previousStartDate}
        AND o."createdAt" < ${startDate}
    `

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0
      return ((current - previous) / previous) * 100
    }

    const changes = {
      totalRevenue: calculateChange(metrics[0].totalRevenue, previousMetrics[0].totalRevenue),
      netProfit: calculateChange(metrics[0].netProfit, previousMetrics[0].netProfit),
      totalOrders: calculateChange(metrics[0].totalOrders, previousMetrics[0].totalOrders),
      totalProductsSold: calculateChange(metrics[0].totalProductsSold, previousMetrics[0].totalProductsSold),
    }

    return NextResponse.json({
      metrics: metrics[0],
      changes,
      timeSeriesData,
      topProducts,
    })
  } catch (error) {
    console.error('Error fetching profit metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profit metrics' },
      { status: 500 }
    )
  }
} 