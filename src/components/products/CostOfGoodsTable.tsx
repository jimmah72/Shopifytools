'use client';

import React, { useState, useRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';

interface Variant {
  id: string;
  price: number;
  inventory_cost: number;
  sku: string;
  inventory_quantity: number;
  inventory_tracked: boolean;
  cost?: number;
}

interface Product {
  id: string;
  title: string;
  image?: string;
  status: 'Active' | 'Draft' | 'Archived';
  lastEdited: string;
  sellingPrice: number;
  costOfGoodsSold: number;
  handlingFees: number;
  miscFees: number;
  margin: number;
  costSource: 'SHOPIFY' | 'MANUAL';
  shopifyCostOfGoodsSold?: number | null;
  shopifyHandlingFees?: number;
  variants: Variant[];
}

interface CostOfGoodsTableProps {
  products: Product[];
  onCostUpdate: (productId: string, newCost: number) => void;
  onHandlingFeesUpdate: (productId: string, newFees: number) => void;
  onMiscFeesUpdate: (productId: string, newFees: number) => void;
  onCostSourceToggle: (productId: string, newSource: 'SHOPIFY' | 'MANUAL') => void;
  onSave: (productId: string, costs: { costOfGoodsSold: number; handlingFees: number; miscFees: number; costSource: string }) => Promise<void>;
  // Variant expansion props
  expandedProducts: Set<string>;
  onToggleExpansion: (productId: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export function CostOfGoodsTable({ 
  products, 
  onCostUpdate, 
  onHandlingFeesUpdate, 
  onMiscFeesUpdate, 
  onCostSourceToggle,
  onSave,
  expandedProducts,
  onToggleExpansion,
  onExpandAll,
  onCollapseAll
}: CostOfGoodsTableProps) {
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [unsavedChanges, setUnsavedChanges] = useState<Set<string>>(new Set());
  const [savingProducts, setSavingProducts] = useState<Set<string>>(new Set());
  const [variantLoading, setVariantLoading] = useState<{ [variantId: string]: boolean }>({});
  const [variantErrors, setVariantErrors] = useState<{ [variantId: string]: string | null }>({});
  const [variantEdits, setVariantEdits] = useState<{ [variantId: string]: { cost?: number; handling?: number; misc?: number } }>({});
  const { theme } = useTheme();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatCurrencyForInput = (amount: number) => {
    return amount.toFixed(2);
  };

  const parseCurrencyInput = (value: string) => {
    // Remove any non-numeric characters except decimal point
    const cleanValue = value.replace(/[^0-9.]/g, '');
    return parseFloat(cleanValue) || 0;
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)));
    }
  };

  const handleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const markAsChanged = (productId: string) => {
    setUnsavedChanges(prev => new Set([...prev, productId]));
  };

  const handleCostChange = (productId: string, newCost: number) => {
    onCostUpdate(productId, newCost);
    markAsChanged(productId);
  };

  const handleHandlingFeesChange = (productId: string, newFees: number) => {
    onHandlingFeesUpdate(productId, newFees);
    markAsChanged(productId);
  };

  const handleMiscFeesChange = (productId: string, newFees: number) => {
    onMiscFeesUpdate(productId, newFees);
    markAsChanged(productId);
  };

  const handleSourceToggle = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const newSource = product.costSource === 'SHOPIFY' ? 'MANUAL' : 'SHOPIFY';
    onCostSourceToggle(productId, newSource);
    markAsChanged(productId);
  };

  const handleSave = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setSavingProducts(prev => new Set([...prev, productId]));
    
    try {
      await onSave(productId, {
        costOfGoodsSold: product.costOfGoodsSold,
        handlingFees: product.handlingFees,
        miscFees: product.miscFees,
        costSource: product.costSource
      });
      
      setUnsavedChanges(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setSavingProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  const getDisplayedCostOfGoodsSold = (product: Product) => {
    if (product.costSource === 'SHOPIFY') {
      return product.shopifyCostOfGoodsSold || 0;
    }
    return product.costOfGoodsSold;
  };

  const getDisplayedHandlingFees = (product: Product) => {
    if (product.costSource === 'SHOPIFY') {
      return 0;
    }
    return product.handlingFees;
  };

  const isFieldEditable = (product: Product, field: 'cost' | 'handling' | 'misc') => {
    if (field === 'misc') return true; // Misc is always editable
    return product.costSource === 'MANUAL';
  };

  const isShopifyCostAvailable = (product: Product) => {
    // Cost data is available if shopifyCostOfGoodsSold is not null/undefined
    // null means no cost data available from Shopify
    return product.shopifyCostOfGoodsSold !== null && product.shopifyCostOfGoodsSold !== undefined;
  };

  // Handler for auto-saving variant fields
  const handleVariantFieldChange = async (
    productId: string,
    variantId: string,
    field: 'cost' | 'handling' | 'misc',
    value: number
  ) => {
    setVariantEdits(prev => ({
      ...prev,
      [variantId]: {
        ...prev[variantId],
        [field]: value
      }
    }));
  };

  const handleVariantFieldBlur = async (
    productId: string,
    variantId: string,
    field: 'cost' | 'handling' | 'misc',
    value: number
  ) => {
    setVariantLoading(prev => ({ ...prev, [variantId]: true }));
    setVariantErrors(prev => ({ ...prev, [variantId]: null }));
    try {
      // PATCH to /api/products/[shopifyProductId]/variants/[shopifyVariantId]/costs
      const payload: any = {};
      if (field === 'cost') payload.cost = value;
      if (field === 'handling') payload.handling = value;
      if (field === 'misc') payload.misc = value;
      payload.source = products.find(p => p.id === productId)?.costSource || 'SHOPIFY';
      const res = await fetch(`/api/products/${productId}/variants/${variantId}/costs`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        throw new Error('Failed to save variant');
      }
      // Optionally update local state with new value
      setVariantEdits(prev => ({ ...prev, [variantId]: {} }));
    } catch (err) {
      setVariantErrors(prev => ({ ...prev, [variantId]: 'Failed to save' }));
    } finally {
      setVariantLoading(prev => ({ ...prev, [variantId]: false }));
    }
  };

  return (
      <div className="rounded-lg border border-gray-600 overflow-hidden bg-gray-900">
        <Table>
          <TableHeader className="bg-gray-800">
            <TableRow className="border-b-2 border-gray-600 hover:bg-transparent">
              <TableHead className="w-[40px] h-10">
                <input
                  type="checkbox"
                  checked={selectedProducts.size === products.length}
                  onChange={handleSelectAll}
                  className="rounded border-gray-600 bg-transparent"
                />
              </TableHead>
              <TableHead className="font-medium text-gray-400 w-[400px] text-left">Products & Variants</TableHead>
              <TableHead className="font-medium text-gray-400 w-[100px] text-left">Status</TableHead>
              <TableHead className="font-medium text-gray-400 w-[100px] text-left">Last Edited</TableHead>
              <TableHead className="font-medium text-gray-400 w-[100px] text-left">Selling Price</TableHead>
              <TableHead className="font-medium text-gray-400 w-[100px] text-left">Source</TableHead>
              <TableHead className="font-medium text-gray-400 w-[130px] text-left">Cost of Goods Sold</TableHead>
              <TableHead className="font-medium text-gray-400 w-[130px] text-left">Handling Fees</TableHead>
              <TableHead className="font-medium text-gray-400 w-[130px] text-left">Misc</TableHead>
              <TableHead className="font-medium text-gray-400 w-[100px] text-left">Margin</TableHead>
              <TableHead className="font-medium text-gray-400 w-[100px] text-left">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
            <React.Fragment key={product.id}>
              {/* Main Product Row */}
              <TableRow 
                className={`border-b border-gray-600 hover:bg-gray-800 transition-colors ${
                  unsavedChanges.has(product.id) ? 'bg-yellow-900/20' : ''
                }`}
              >
                <TableCell className="h-12">
                  <input
                    type="checkbox"
                    checked={selectedProducts.has(product.id)}
                    onChange={() => handleSelectProduct(product.id)}
                    className="rounded border-gray-600 bg-transparent"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {/* Expand/Collapse button for products with multiple variants */}
                    {product.variants.length > 1 ? (
                      <button
                        onClick={() => onToggleExpansion(product.id)}
                        className="flex items-center justify-center w-5 h-5 rounded hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                        title={`${expandedProducts.has(product.id) ? 'Collapse' : 'Expand'} variants`}
                      >
                        {expandedProducts.has(product.id) ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    ) : (
                      <div className="w-5 h-5" /> // Spacer for products without variants
                    )}
                    
                    {product.image ? (
                      <div className="flex-shrink-0 relative w-8 h-8">
                        <Image
                          src={product.image}
                          alt={product.title}
                          fill
                          className="object-cover rounded"
                          sizes="32px"
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                        <span className="text-gray-400 text-xs">No img</span>
                      </div>
                    )}
                    <div className="flex flex-col">
                    <span className="font-medium text-sm text-gray-200">{product.title}</span>
                      {product.variants.length > 1 && (
                        <span className="text-xs text-gray-500">
                          {product.variants.length} variants
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={`border-0 font-medium ${
                      product.status === 'Active' 
                        ? 'bg-green-400 text-black dark:bg-green-400 dark:text-black'
                        : product.status === 'Draft'
                        ? 'bg-yellow-400 text-black dark:bg-yellow-400 dark:text-black'
                        : 'bg-gray-400 text-black dark:bg-gray-400 dark:text-black'
                    }`}
                  >
                    {product.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-gray-400">{product.lastEdited}</TableCell>
                <TableCell className="text-right font-medium text-sm">
                  {formatCurrency(product.sellingPrice)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSourceToggle(product.id)}
                      className={`h-8 px-3 text-xs font-medium border-0 ${
                        product.costSource === 'SHOPIFY' 
                          ? isShopifyCostAvailable(product)
                            ? 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-500 dark:text-white dark:hover:bg-blue-600' 
                            : 'bg-yellow-500 text-black hover:bg-yellow-600 dark:bg-yellow-500 dark:text-black dark:hover:bg-yellow-600'
                          : 'bg-orange-500 text-white hover:bg-orange-600 dark:bg-orange-500 dark:text-white dark:hover:bg-orange-600'
                      }`}
                      title={
                        product.costSource === 'SHOPIFY' && !isShopifyCostAvailable(product)
                          ? 'Shopify cost data not available - consider switching to Manual mode'
                          : ''
                      }
                    >
                      {product.costSource}
                    </Button>
                    {product.costSource === 'SHOPIFY' && !isShopifyCostAvailable(product) && (
                      <span className="text-xs text-yellow-400" title="Shopify cost data not available">
                        ⚠️
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {isFieldEditable(product, 'cost') ? (
                    <Input
                      type="text"
                      value={formatCurrencyForInput(getDisplayedCostOfGoodsSold(product))}
                      onChange={(e) => handleCostChange(product.id, parseCurrencyInput(e.target.value))}
                      className="w-28 text-right bg-gray-900 border-gray-700 h-8 text-sm"
                      placeholder="0.00"
                    />
                  ) : (
                    <div 
                      className={`w-28 h-8 flex items-center justify-end text-sm px-2 rounded ${
                        product.costSource === 'SHOPIFY' && !isShopifyCostAvailable(product)
                          ? 'text-yellow-400 bg-yellow-900/20 border border-yellow-600'
                          : 'text-gray-400 bg-gray-800'
                      }`}
                      title={
                        product.costSource === 'SHOPIFY' && !isShopifyCostAvailable(product)
                          ? 'No cost data available from Shopify'
                          : ''
                      }
                    >
                      {product.costSource === 'SHOPIFY' && !isShopifyCostAvailable(product) 
                        ? 'N/A' 
                        : formatCurrency(getDisplayedCostOfGoodsSold(product))
                      }
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {isFieldEditable(product, 'handling') ? (
                    <Input
                      type="text"
                      value={formatCurrencyForInput(getDisplayedHandlingFees(product))}
                      onChange={(e) => handleHandlingFeesChange(product.id, parseCurrencyInput(e.target.value))}
                      className="w-28 text-right bg-gray-900 border-gray-700 h-8 text-sm"
                      placeholder="0.00"
                    />
                  ) : (
                    <div className="w-28 h-8 flex items-center justify-end text-sm text-gray-400 bg-gray-800 rounded px-2">
                      {formatCurrency(getDisplayedHandlingFees(product))}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Input
                    type="text"
                    value={formatCurrencyForInput(product.miscFees)}
                    onChange={(e) => handleMiscFeesChange(product.id, parseCurrencyInput(e.target.value))}
                    className="w-28 text-right bg-gray-900 border-gray-700 h-8 text-sm"
                    placeholder="0.00"
                  />
                </TableCell>
                <TableCell className="text-left font-medium text-sm">
                  <span className={
                    product.margin >= 70 ? 'text-green-400' :
                    product.margin >= 50 ? 'text-yellow-400' :
                    'text-red-400'
                  }>
                    {product.margin.toFixed(2)}%
                  </span>
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSave(product.id)}
                    disabled={!unsavedChanges.has(product.id) || savingProducts.has(product.id)}
                    className="h-8 px-3 text-xs"
                  >
                    {savingProducts.has(product.id) ? 'Saving...' : 'Save'}
                  </Button>
                </TableCell>
              </TableRow>

              {/* Variant Rows (shown when expanded) */}
              {expandedProducts.has(product.id) && product.variants.map((variant, index) => {
                const isManual = product.costSource === 'MANUAL';
                const isShopify = product.costSource === 'SHOPIFY';
                const loading = variantLoading[variant.id];
                const error = variantErrors[variant.id];
                const edits = variantEdits[variant.id] || {};
                return (
                  <TableRow 
                    key={`${product.id}-variant-${variant.id}`}
                    className="border-b border-gray-700 bg-gray-850 hover:bg-gray-800/50 transition-colors"
                  >
                    <TableCell className="h-10 pl-8" />
                    <TableCell className="pl-8">
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-1 h-4 bg-gray-600 rounded-full"></div>
                        <div className="flex flex-col">
                          <span className="text-gray-300 font-medium">
                            {variant.sku || `Variant ${index + 1}`}
                          </span>
                          {variant.sku && (
                            <span className="text-xs text-gray-500">SKU: {variant.sku}</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">—</TableCell>
                    <TableCell className="text-sm text-gray-500">—</TableCell>
                    <TableCell className="text-right font-medium text-sm">{formatCurrency(variant.price)}</TableCell>
                    <TableCell className="text-sm text-gray-500">—</TableCell>
                    {/* Cost */}
                    <TableCell>
                      {isManual ? (
                        <Input
                          type="text"
                          value={edits.cost !== undefined ? formatCurrencyForInput(edits.cost) : formatCurrencyForInput(variant.cost ?? variant.inventory_cost)}
                          onChange={e => handleVariantFieldChange(product.id, variant.id, 'cost', parseCurrencyInput(e.target.value))}
                          onBlur={e => handleVariantFieldBlur(product.id, variant.id, 'cost', parseCurrencyInput(e.target.value))}
                          className="w-28 text-right bg-gray-900 border-gray-700 h-8 text-sm"
                          placeholder="0.00"
                          disabled={loading}
                        />
                      ) : (
                        <div className="w-28 h-8 flex items-center justify-end text-sm text-gray-400 bg-gray-800 rounded px-2">
                          {formatCurrency(variant.cost ?? variant.inventory_cost)}
                        </div>
                      )}
                      {loading && <span className="ml-2 text-xs text-blue-400">Saving…</span>}
                      {error && <span className="ml-2 text-xs text-red-400">{error}</span>}
                    </TableCell>
                    {/* Handling */}
                    <TableCell>
                      {isManual ? (
                        <Input
                          type="text"
                          value={edits.handling !== undefined ? formatCurrencyForInput(edits.handling) : formatCurrencyForInput(variantEdits[variant.id]?.handling || 0)}
                          onChange={e => handleVariantFieldChange(product.id, variant.id, 'handling', parseCurrencyInput(e.target.value))}
                          onBlur={e => handleVariantFieldBlur(product.id, variant.id, 'handling', parseCurrencyInput(e.target.value))}
                          className="w-28 text-right bg-gray-900 border-gray-700 h-8 text-sm"
                          placeholder="0.00"
                          disabled={loading}
                        />
                      ) : (
                        <div className="w-28 h-8 flex items-center justify-end text-sm text-gray-400 bg-gray-800 rounded px-2">
                          {formatCurrency(variantEdits[variant.id]?.handling || 0)}
                        </div>
                      )}
                    </TableCell>
                    {/* Misc */}
                    <TableCell>
                      {isManual || isShopify ? (
                        <Input
                          type="text"
                          value={edits.misc !== undefined ? formatCurrencyForInput(edits.misc) : formatCurrencyForInput(variantEdits[variant.id]?.misc || 0)}
                          onChange={e => handleVariantFieldChange(product.id, variant.id, 'misc', parseCurrencyInput(e.target.value))}
                          onBlur={e => handleVariantFieldBlur(product.id, variant.id, 'misc', parseCurrencyInput(e.target.value))}
                          className="w-28 text-right bg-gray-900 border-gray-700 h-8 text-sm"
                          placeholder="0.00"
                          disabled={loading}
                        />
                      ) : (
                        <div className="w-28 h-8 flex items-center justify-end text-sm text-gray-400 bg-gray-800 rounded px-2">
                          {formatCurrency(variantEdits[variant.id]?.misc || 0)}
                        </div>
                      )}
                    </TableCell>
                    {/* Margin */}
                    <TableCell className="text-sm text-gray-500">
                      {variant.price > 0 ? (
                        <span className={
                          ((variant.price - variant.inventory_cost) / variant.price) * 100 >= 70 ? 'text-green-400' :
                          ((variant.price - variant.inventory_cost) / variant.price) * 100 >= 50 ? 'text-yellow-400' :
                          'text-red-400'
                        }>
                          {(((variant.price - variant.inventory_cost) / variant.price) * 100).toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">—</TableCell>
                  </TableRow>
                );
              })}
            </React.Fragment>
            ))}
          </TableBody>
        </Table>
    </div>
  );
} 