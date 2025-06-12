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
  margin: number;
}

interface CostOfGoodsTableProps {
  products: Product[];
  onCostUpdate: (productId: string, newCost: number) => void;
  onHandlingFeesUpdate: (productId: string, newFees: number) => void;
}

export function CostOfGoodsTable({ products, onCostUpdate, onHandlingFeesUpdate }: CostOfGoodsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const { theme } = useTheme();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
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

      <div className="rounded-lg border border-gray-700 overflow-hidden bg-gray-950">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-800 hover:bg-transparent">
              <TableHead className="w-[40px] h-10">
                <input
                  type="checkbox"
                  checked={selectedProducts.size === products.length}
                  onChange={handleSelectAll}
                  className="rounded border-gray-600 bg-transparent"
                />
              </TableHead>
              <TableHead className="font-medium text-gray-400">Products & Variants</TableHead>
              <TableHead className="font-medium text-gray-400">Status</TableHead>
              <TableHead className="font-medium text-gray-400">Last Edited</TableHead>
              <TableHead className="text-right font-medium text-gray-400">Selling Price</TableHead>
              <TableHead className="font-medium text-gray-400">Source</TableHead>
              <TableHead className="text-right font-medium text-gray-400">Cost of Goods Sold</TableHead>
              <TableHead className="text-right font-medium text-gray-400">Handling Fees</TableHead>
              <TableHead className="text-right font-medium text-gray-400">Margin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id} className="border-b border-gray-800 hover:bg-gray-900/50">
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
                      <div className="flex-shrink-0">
                        <Image
                          src={product.image}
                          alt={product.title}
                          width={32}
                          height={32}
                          className="object-cover rounded"
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center flex-shrink-0">
                        <span className="text-gray-400 text-xs">No img</span>
                      </div>
                    )}
                    <span className="font-medium text-sm text-gray-200">{product.title}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 font-normal">
                    {product.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-gray-400">{product.lastEdited}</TableCell>
                <TableCell className="text-right font-medium text-sm">
                  {formatCurrency(product.sellingPrice)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-gray-700 text-gray-400 font-normal">
                    MANUAL
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    value={product.costOfGoodsSold}
                    onChange={(e) => onCostUpdate(product.id, parseFloat(e.target.value))}
                    className="w-28 text-right bg-gray-900 border-gray-700 h-8 text-sm"
                    step="0.01"
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    value={product.handlingFees}
                    onChange={(e) => onHandlingFeesUpdate(product.id, parseFloat(e.target.value))}
                    className="w-28 text-right bg-gray-900 border-gray-700 h-8 text-sm"
                    step="0.01"
                  />
                </TableCell>
                <TableCell className="text-right font-medium text-sm">
                  <span className={
                    product.margin >= 70 ? 'text-green-400' :
                    product.margin >= 50 ? 'text-yellow-400' :
                    'text-red-400'
                  }>
                    {product.margin.toFixed(2)}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 