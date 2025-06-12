# ShopifyTools Cost Data Implementation - Progress Context

**Date**: December 12, 2025  
**Session**: Cost of Goods Sold (COGS) Shopify Integration

## **GOAL**
Implement proper Shopify cost data fetching for Cost of Goods Sold without hitting API rate limits

---

## **✅ ACCOMPLISHED**

### 1. **Rate Limit Solution Strategy**
- ✅ Switched from individual API calls for all 3,000+ products to a hybrid approach
- ✅ Bulk fetch basic product data (names, images, prices) for all products
- ✅ Individual cost fetching only for products on current page (20 products max)

### 2. **GraphQL Cost Fetching Implementation**
- ✅ Updated `getAllProducts()` to fetch basic data without costs using GraphQL pagination
- ✅ Created `getProductsCostData()` function for page-specific cost fetching
- ✅ Fixed GraphQL query structure and TypeScript types
- ✅ Implemented proper error handling and batch processing (5 products per batch)

### 3. **API Updates**
- ✅ Updated products API route to support `fetchCosts=true` parameter
- ✅ Modified frontend to automatically request cost data for current page
- ✅ All products correctly default to `SHOPIFY` source as requested

### 4. **Technical Implementation Details**
- ✅ Modified `src/lib/shopify-api.ts` with new functions:
  - `getAllProducts()` - bulk fetch basic data
  - `getProductsCostData()` - page-specific cost fetching
- ✅ Updated `src/app/api/products/route.ts` to support `fetchCosts` parameter
- ✅ Modified `src/app/products/page.tsx` to automatically fetch costs for current page

---

## **❌ CURRENT ISSUE**

**GraphQL ID Format Problem**: 
- GraphQL errors showing: `'gid://shopify/Product/gid://shopify/Product/8428540526912'`
- The product IDs are being double-prefixed with the GraphQL ID format
- Need to fix the ID format in `getProductsCostData()` function

**Error Details**:
```
Variable $id of type ID! was provided invalid value
value: 'gid://shopify/Product/gid://shopify/Product/9700425826624'
```

---

## **🔧 IMMEDIATE NEXT STEPS**

### 1. **Fix GraphQL ID Issue**
- Strip existing `gid://shopify/Product/` prefix before adding it again
- Update line in `getProductsCostData()`:
  ```typescript
  // CURRENT (BROKEN):
  const variables: { id: string } = { id: `gid://shopify/Product/${productId}` };
  
  // SHOULD BE:
  const cleanId = productId.replace('gid://shopify/Product/', '');
  const variables: { id: string } = { id: `gid://shopify/Product/${cleanId}` };
  ```

### 2. **Verify Real Cost Data**
- Once ID issue is fixed, test that the "12oz Kids Tumbler" shows $6.85 instead of $0.00
- Confirm cost data flows correctly through API → Frontend → Table

### 3. **Final Testing**
- Test pagination with cost fetching
- Verify only current page products trigger individual API calls
- Confirm rate limits are respected

---

## **📋 IMPLEMENTATION STATUS**

| Component | Status | Notes |
|-----------|--------|-------|
| **Architecture** | ✅ Complete | Hybrid bulk + page-specific approach |
| **Rate Limiting** | ✅ Complete | Proper batching and delays implemented |
| **Frontend Integration** | ✅ Complete | Automatic cost fetching on page load |
| **Data Accuracy** | ❌ Blocked | GraphQL ID format causing all costs to return 0 |
| **User Validation** | ⏳ Pending | Awaiting ID fix to show real $6.85 cost data |

---

## **TEST CASE**
- **Product**: "12oz Kids Tumbler Engraved- animals" 
- **Expected Cost**: $6.85 (as shown in Shopify admin)
- **Current Result**: $0.00 (due to GraphQL ID format issue)
- **Product ID**: `9829927911744`

---

## **BACKGROUND CONTEXT**

### **Original Problem**
- Dashboard and orders pages hitting Shopify API rate limits
- Only getting 4 days instead of 30 days of data due to 499 order limit
- Cost of Goods Sold not showing real Shopify cost data

### **Previous Solutions Applied**
- ✅ Fixed 499 order limit (now fetching 3,743 orders correctly)
- ✅ Fixed products pagination (now fetching 464 products correctly)
- ✅ Fixed Shopify source button defaulting
- ⏳ Cost data fetching (in progress - ID format issue)

### **Key Files Modified**
- `src/lib/shopify-api.ts` - GraphQL functions
- `src/app/api/products/route.ts` - API endpoint
- `src/app/products/page.tsx` - Frontend integration
- `src/components/products/CostOfGoodsTable.tsx` - UI logic

**The foundation is solid - just need to fix the ID format issue to complete the implementation.** 