'use client';

import React, { useState } from 'react';
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
import Image from 'next/image';
import { Search } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

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
  shopifyCostOfGoodsSold?: number;
  shopifyHandlingFees?: number;
}

interface CostOfGoodsTableProps {
  products: Product[];
  onCostUpdate: (productId: string, newCost: number) => void;
  onHandlingFeesUpdate: (productId: string, newFees: number) => void;
  onMiscFeesUpdate: (productId: string, newFees: number) => void;
  onCostSourceToggle: (productId: string, newSource: 'SHOPIFY' | 'MANUAL') => void;
  onSave: (productId: string, costs: { costOfGoodsSold: number; handlingFees: number; miscFees: number; costSource: string }) => Promise<void>;
}

export function CostOfGoodsTable({ 
  products, 
  onCostUpdate, 
  onHandlingFeesUpdate, 
  onMiscFeesUpdate, 
  onCostSourceToggle,
  onSave 
}: CostOfGoodsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [unsavedChanges, setUnsavedChanges] = useState<Set<string>>(new Set());
  const [savingProducts, setSavingProducts] = useState<Set<string>>(new Set());
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
    // Cost data is available if shopifyCostOfGoodsSold is defined (even if 0)
    // 0 is a valid cost value from Shopify
    return product.shopifyCostOfGoodsSold !== undefined;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Button variant="default" className="bg-green-600 hover:bg-green-700 text-white">
            Worldwide
          </Button>
          <Button variant="outline" className="border-dashed border-gray-600 dark:border-gray-600">
            + Add zone
          </Button>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              type="text"
              placeholder="Search by product name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-[300px] bg-transparent border-gray-600 dark:border-gray-600 h-9 text-sm"
            />
          </div>
          <Button variant="outline" size="sm" className="h-9 px-4 text-sm font-normal dark:border-gray-600">
            Re-calculate product past orders
          </Button>
          <Button variant="outline" size="sm" className="h-9 px-4 text-sm font-normal dark:border-gray-600">
            Bulk actions
          </Button>
        </div>
      </div>

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
              <TableRow 
                key={product.id} 
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
                    <span className="font-medium text-sm text-gray-200">{product.title}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-green-400 text-black border-0 font-medium dark:bg-green-400 dark:text-black">
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
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 