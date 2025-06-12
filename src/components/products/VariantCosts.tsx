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
import { formatCurrency } from '@/lib/utils';

interface Variant {
  id: string;
  title: string;
  sku: string | null;
  price: number;
  cost: number;
  inventoryQty: number;
  costSource: 'MANUAL' | 'SHOPIFY';
  costLastUpdated: string | null;
}

interface VariantCostsProps {
  variants: Variant[];
  onCostUpdate: (variantId: string, newCost: number, source: 'MANUAL' | 'SHOPIFY') => void;
  onBulkUpdate?: (costs: { variantId: string; cost: number; source: 'MANUAL' }[]) => void;
}

export function VariantCosts({ variants, onCostUpdate, onBulkUpdate }: VariantCostsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [selectedVariants, setSelectedVariants] = useState<Set<string>>(new Set());
  const [bulkEditValue, setBulkEditValue] = useState<string>('');

  const handleEdit = (variant: Variant) => {
    setEditingId(variant.id);
    setEditValue(variant.cost.toString());
  };

  const handleSave = (variantId: string) => {
    const newCost = parseFloat(editValue);
    if (!isNaN(newCost) && newCost >= 0) {
      onCostUpdate(variantId, newCost, 'MANUAL');
    }
    setEditingId(null);
    setEditValue('');
  };

  const handleBulkEdit = () => {
    const newCost = parseFloat(bulkEditValue);
    if (!isNaN(newCost) && newCost >= 0 && onBulkUpdate) {
      const updates = Array.from(selectedVariants).map(variantId => ({
        variantId,
        cost: newCost,
        source: 'MANUAL' as const,
      }));
      onBulkUpdate(updates);
      setSelectedVariants(new Set());
      setBulkEditValue('');
    }
  };

  const toggleVariantSelection = (variantId: string) => {
    const newSelected = new Set(selectedVariants);
    if (newSelected.has(variantId)) {
      newSelected.delete(variantId);
    } else {
      newSelected.add(variantId);
    }
    setSelectedVariants(newSelected);
  };

  const toggleAllVariants = () => {
    if (selectedVariants.size === variants.length) {
      setSelectedVariants(new Set());
    } else {
      setSelectedVariants(new Set(variants.map(v => v.id)));
    }
  };

  return (
    <div className="space-y-4">
      {selectedVariants.size > 0 && (
        <div className="flex items-center gap-4 p-4 bg-secondary/10 rounded-lg">
          <span className="text-sm font-medium">
            {selectedVariants.size} variant{selectedVariants.size > 1 ? 's' : ''} selected
          </span>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={bulkEditValue}
            onChange={(e) => setBulkEditValue(e.target.value)}
            placeholder="Enter bulk cost"
            className="w-32"
          />
          <Button onClick={handleBulkEdit} size="sm">
            Update Selected
          </Button>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <input
                type="checkbox"
                checked={selectedVariants.size === variants.length}
                onChange={toggleAllVariants}
              />
            </TableHead>
            <TableHead>Variant</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Cost</TableHead>
            <TableHead className="text-right">Margin</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {variants.map((variant) => {
            const margin = ((variant.price - variant.cost) / variant.price) * 100;
            
            return (
              <TableRow key={variant.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedVariants.has(variant.id)}
                    onChange={() => toggleVariantSelection(variant.id)}
                  />
                </TableCell>
                <TableCell>{variant.title}</TableCell>
                <TableCell>{variant.sku || '-'}</TableCell>
                <TableCell className="text-right">{formatCurrency(variant.price)}</TableCell>
                <TableCell className="text-right">
                  {editingId === variant.id ? (
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => handleSave(variant.id)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSave(variant.id)}
                      className="w-24"
                    />
                  ) : (
                    formatCurrency(variant.cost)
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <span className={margin < 0 ? 'text-red-500' : margin < 20 ? 'text-yellow-500' : 'text-green-500'}>
                    {margin.toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={variant.costSource === 'SHOPIFY' ? "secondary" : "outline"}>
                    {variant.costSource}
                  </Badge>
                </TableCell>
                <TableCell>
                  {variant.costLastUpdated 
                    ? new Date(variant.costLastUpdated).toLocaleDateString()
                    : '-'
                  }
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(variant)}
                  >
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
} 