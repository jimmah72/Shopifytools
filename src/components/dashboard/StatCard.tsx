'use client';

import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  icon: any;
  loading?: boolean;
  variant?: 'default' | 'income' | 'expense' | 'neutral';
  onClick?: () => void;
  clickable?: boolean;
}

export const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  loading,
  variant = 'default',
  onClick,
  clickable = false
}: StatCardProps) => {
  const getCardClasses = () => {
    const hoverClasses = clickable ? "cursor-pointer hover:scale-105 hover:shadow-lg transition-all" : "";
    switch (variant) {
      case 'income':
        return `bg-green-900/20 border border-green-700/50 rounded-lg p-6 ${hoverClasses}`;
      case 'expense':
        return `bg-red-900/20 border border-red-700/50 rounded-lg p-6 ${hoverClasses}`;
      case 'neutral':
        return `bg-gray-800 border border-gray-700 rounded-lg p-6 ${hoverClasses}`;
      default:
        return `bg-gray-800 border border-gray-700 rounded-lg p-6 ${hoverClasses}`;
    }
  };

  const getIconClasses = () => {
    switch (variant) {
      case 'income':
        return "h-4 w-4 text-green-400";
      case 'expense':
        return "h-4 w-4 text-red-400";
      case 'neutral':
        return "h-4 w-4 text-gray-400";
      default:
        return "h-4 w-4 text-blue-400";
    }
  };

  return (
    <div className={getCardClasses()} onClick={clickable ? onClick : undefined}>
      <div className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="text-sm font-medium text-gray-400">{title}</div>
        <Icon className={getIconClasses()} />
      </div>
      <div>
        {loading ? (
          <div className="h-8 bg-gray-700 animate-pulse rounded"></div>
        ) : (
          <div className="text-2xl font-bold text-gray-100">{value}</div>
        )}
      </div>
      {clickable && !loading && (
        <div className="text-xs text-gray-500 mt-1">
          Click for breakdown
        </div>
      )}
    </div>
  );
}; 