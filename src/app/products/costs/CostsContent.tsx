import React, { useState } from 'react';
import { CostOfGoodsTable } from '@/components/products/CostOfGoodsTable';

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
}

const CostsContent: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculateMargin = (product: Product) => {
    const totalCosts = product.costOfGoodsSold + product.handlingFees + product.miscFees;
    return ((product.sellingPrice - totalCosts) / product.sellingPrice) * 100;
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
        />
      )}
    </div>
  );
};

export default CostsContent; 