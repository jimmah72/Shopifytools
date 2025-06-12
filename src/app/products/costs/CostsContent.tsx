"use client"

import React, { useState } from 'react';
import { CostOfGoodsTable } from '@/components/products/CostOfGoodsTable';

namespace CostsContent {
  export interface Variant {
    id: string;
    price: number;
    inventory_cost: number;
    cost?: number;
    sku: string;
    inventory_quantity: number;
    inventory_tracked: boolean;
  }

  export interface Product {
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
}

const CostsContent: React.FC = () => {
  const [products, setProducts] = useState<CostsContent.Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  const calculateMargin = (product: CostsContent.Product) => {
    const totalCosts = product.costOfGoodsSold + product.handlingFees + product.miscFees;
    return ((product.sellingPrice - totalCosts) / product.sellingPrice) * 100;
  };

  const handleToggleExpansion = (productId: string) => {
    setExpandedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleExpandAll = () => {
    setExpandedProducts(new Set(products.map(p => p.id)));
  };

  const handleCollapseAll = () => {
    setExpandedProducts(new Set());
  };

  const handleCostUpdate = async (productId: string, newCost: number) => {
    // ... existing code ...
  };

  const handleHandlingFeesUpdate = async (productId: string, newFees: number) => {
    // ... existing code ...
  };

  const handleMiscFeesUpdate = async (productId: string, newFees: number) => {
    try {
      setProducts(products.map(product => {
        if (product.id === productId) {
          const updatedProduct = {
            ...product,
            miscFees: newFees,
            margin: calculateMargin({ ...product, miscFees: newFees })
          };
          return updatedProduct;
        }
        return product;
      }));

      await fetch(`/api/products/${productId}/costs`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ miscFees: newFees }),
      });
    } catch (error) {
      console.error('Failed to update misc fees:', error);
      // Revert the optimistic update
      setProducts(products);
      setError('Failed to update misc fees. Please try again.');
    }
  };

  const handleCostSourceToggle = async (productId: string, newSource: 'SHOPIFY' | 'MANUAL') => {
    try {
      setProducts(products.map(product => {
        if (product.id === productId) {
          return {
            ...product,
            costSource: newSource
          };
        }
        return product;
      }));

      await fetch(`/api/products/${productId}/costs`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ costSource: newSource }),
      });
    } catch (error) {
      console.error('Failed to update cost source:', error);
      // Revert the optimistic update
      setProducts(products);
      setError('Failed to update cost source. Please try again.');
    }
  };

  const handleSave = async (productId: string, costs: { 
    costOfGoodsSold: number; 
    handlingFees: number; 
    miscFees: number; 
    costSource: string 
  }) => {
    try {
      await fetch(`/api/products/${productId}/costs`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(costs),
      });
    } catch (error) {
      console.error('Failed to save product costs:', error);
      throw error; // Re-throw so the component can handle it
    }
  };

  return (
    <div className="container mx-auto py-6">
      {error && (
        <div className="bg-red-500 text-white p-4 mb-4 rounded">
          {error}
        </div>
      )}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <CostOfGoodsTable
          products={products}
          onCostUpdate={handleCostUpdate}
          onHandlingFeesUpdate={handleHandlingFeesUpdate}
          onMiscFeesUpdate={handleMiscFeesUpdate}
          onCostSourceToggle={handleCostSourceToggle}
          onSave={handleSave}
          expandedProducts={expandedProducts}
          onToggleExpansion={handleToggleExpansion}
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
        />
      )}
    </div>
  );
};

export default CostsContent; 