# Prisma Standards for ShopifyTools

This document outlines the standard patterns and best practices for using Prisma in our ShopifyTools application.

## 1. Prisma Client Setup

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
```

## 2. Importing Prisma

Always import from the centralized prisma client:
```typescript
import { prisma } from '@/lib/prisma'
```

## 3. API Route Structure

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Mark route as dynamic
export const dynamic = 'force-dynamic'

export async function GET/POST/etc(request: NextRequest) {
  try {
    // Your Prisma queries here
    const result = await prisma.someModel.someOperation({
      // query options
    })
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error description:', error)
    return NextResponse.json(
      { error: 'Error message' },
      { status: 500 }
    )
  }
}
```

## 4. Common Query Patterns

- Use `findFirst()` for single records
- Use `findMany()` with proper `where`, `include`, `select`, and `orderBy`
- Use `updateMany()` for batch operations
- Always handle errors with try/catch
- Use proper TypeScript types from `@prisma/client`

## 5. Error Handling

```typescript
try {
  // Prisma operations
} catch (error) {
  console.error('Descriptive error message:', error)
  return NextResponse.json(
    { 
      error: 'User-friendly error message',
      details: error instanceof Error ? error.message : String(error)
    },
    { status: 500 }
  )
}
```

## 6. Dynamic Route Handling

Always mark API routes as dynamic to prevent caching:
```typescript
export const dynamic = 'force-dynamic'
```

## 7. Query Best Practices

- Use `include` for related data
- Use `select` to limit returned fields
- Use proper pagination with `skip` and `take`
- Use `orderBy` for consistent sorting
- Use transactions for multiple operations

## 8. Type Safety

- Use TypeScript interfaces for request/response data
- Leverage Prisma's generated types
- Validate input data before queries

## Example Usage

```typescript
// Example of a well-structured API route
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

interface QueryParams {
  page?: number
  limit?: number
  search?: string
}

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const params = parseQueryParams(request)
    const skip = (params.page - 1) * params.limit
    
    const [items, total] = await prisma.$transaction([
      prisma.item.findMany({
        where: {
          name: { contains: params.search }
        },
        include: {
          category: true
        },
        skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.item.count({
        where: {
          name: { contains: params.search }
        }
      })
    ])

    return NextResponse.json({
      items,
      total,
      page: params.page,
      totalPages: Math.ceil(total / params.limit)
    })
  } catch (error) {
    console.error('Failed to fetch items:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch items',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

function parseQueryParams(request: NextRequest): QueryParams {
  const searchParams = request.nextUrl.searchParams
  return {
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '10'),
    search: searchParams.get('search') || ''
  }
}
``` 