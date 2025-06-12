import { Suspense } from 'react';
import CostsContent from './CostsContent';

export default function ProductCostsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Cost Of Goods</h1>
        <p className="text-gray-600">
          Set up and manage your Cost of Goods Sold (COGS) to ensure precise Net Profit calculations.{' '}
          <a href="#" className="text-blue-500 hover:underline">See how to set up COGS</a>
        </p>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <CostsContent />
      </Suspense>
    </div>
  );
} 