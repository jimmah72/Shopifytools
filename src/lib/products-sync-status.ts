interface ProductsSyncStatus {
  syncInProgress: boolean;
  syncType: 'manual' | 'auto' | 'initial' | null;
  totalProducts: number;
  processedProducts: number;
  currentProduct: string;
  lastSyncAt: string | null;
  errorMessage: string | null;
  costDataUpdated: number;
  productsWithCostData: number;
}

let syncStatus: ProductsSyncStatus = {
  syncInProgress: false,
  syncType: null,
  totalProducts: 0,
  processedProducts: 0,
  currentProduct: '',
  lastSyncAt: null,
  errorMessage: null,
  costDataUpdated: 0,
  productsWithCostData: 0
};

export const getProductsSyncStatus = (): ProductsSyncStatus => {
  return { ...syncStatus };
};

export const updateProductsSyncStatus = (updates: Partial<ProductsSyncStatus>): void => {
  syncStatus = { ...syncStatus, ...updates };
};

export const resetProductsSyncStatus = (): void => {
  syncStatus = {
    syncInProgress: false,
    syncType: null,
    totalProducts: 0,
    processedProducts: 0,
    currentProduct: '',
    lastSyncAt: null,
    errorMessage: null,
    costDataUpdated: 0,
    productsWithCostData: 0
  };
}; 