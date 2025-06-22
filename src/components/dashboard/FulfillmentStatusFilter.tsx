'use client';

import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type FulfillmentStatusOption = 'all' | 'unfulfilled' | 'partial' | 'fulfilled' | 'restocked';

interface FulfillmentStatusFilterProps {
  selectedStatus: FulfillmentStatusOption;
  onStatusChange: (status: FulfillmentStatusOption) => void;
  className?: string;
}

const statusOptions: { value: FulfillmentStatusOption; label: string; description: string }[] = [
  { 
    value: 'all', 
    label: 'All Orders', 
    description: 'Include orders regardless of fulfillment status' 
  },
  { 
    value: 'unfulfilled', 
    label: 'Unfulfilled', 
    description: 'Orders that have not been shipped yet' 
  },
  { 
    value: 'partial', 
    label: 'Partially Fulfilled', 
    description: 'Orders with some items shipped' 
  },
  { 
    value: 'fulfilled', 
    label: 'Fulfilled', 
    description: 'Orders that have been completely shipped' 
  },
  { 
    value: 'restocked', 
    label: 'Restocked', 
    description: 'Orders that were returned and restocked' 
  }
];

export function FulfillmentStatusFilter({ 
  selectedStatus, 
  onStatusChange, 
  className = "" 
}: FulfillmentStatusFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentOption = statusOptions.find(option => option.value === selectedStatus) || statusOptions[0];

  const handleSelect = (status: FulfillmentStatusOption) => {
    onStatusChange(status);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between text-left bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700"
      >
        <div className="flex flex-col">
          <span className="font-medium">{currentOption.label}</span>
          <span className="text-xs text-gray-400">{currentOption.description}</span>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className="w-full px-3 py-2 text-left hover:bg-gray-700 first:rounded-t-md last:rounded-b-md transition-colors flex items-center justify-between"
            >
              <div className="flex flex-col">
                <span className="font-medium text-gray-200">{option.label}</span>
                <span className="text-xs text-gray-400">{option.description}</span>
              </div>
              {selectedStatus === option.value && (
                <Check className="h-4 w-4 text-green-400" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Overlay to close dropdown when clicking outside */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

// Helper function to get fulfillment status display info
export function getFulfillmentStatusInfo(status: FulfillmentStatusOption) {
  const option = statusOptions.find(opt => opt.value === status);
  return option || statusOptions[0];
}

// Helper function to determine if accurate calculations are possible
export function hasAccurateShippingCosts(fulfillmentStatus: FulfillmentStatusOption): boolean {
  // Only fulfilled orders have complete shipping cost data
  return fulfillmentStatus === 'fulfilled' || fulfillmentStatus === 'partial';
}

export function getCalculationAccuracyWarning(fulfillmentStatus: FulfillmentStatusOption): string | null {
  switch (fulfillmentStatus) {
    case 'unfulfilled':
      return 'Shipping costs are estimated for unfulfilled orders. For accurate calculations, filter by fulfilled orders.';
    case 'partial':
      return 'Shipping costs may be incomplete for partially fulfilled orders.';
    case 'fulfilled':
      return null; // No warning - shipping costs are complete
    case 'restocked':
      return 'Restocked orders may have modified shipping costs due to returns.';
    case 'all':
      return 'Mix of fulfillment statuses. Shipping costs are accurate only for fulfilled orders.';
    default:
      return null;
  }
} 