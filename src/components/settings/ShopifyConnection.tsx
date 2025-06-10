import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatShopDomain, isValidShopDomain } from '@/lib/shopify';

export default function ShopifyConnection() {
  const [shopDomain, setShopDomain] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const formattedDomain = formatShopDomain(shopDomain);
      
      if (!isValidShopDomain(formattedDomain)) {
        setError('Please enter a valid Shopify store domain');
        return;
      }

      // Redirect to Shopify auth endpoint
      router.push(`/api/auth/shopify?shop=${encodeURIComponent(formattedDomain)}`);
    } catch (error) {
      console.error('Error connecting to Shopify:', error);
      setError('Failed to connect to Shopify. Please try again.');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-white">
          Connect your Shopify Store
        </h3>
        <div className="mt-2 max-w-xl text-sm text-gray-500 dark:text-gray-400">
          <p>
            Connect your Shopify store to start tracking your profits and analytics.
            We'll need access to your orders, products, and inventory data.
          </p>
        </div>
        <form onSubmit={handleConnect} className="mt-5">
          <div className="flex gap-x-4">
            <div className="min-w-0 flex-1">
              <label htmlFor="shop" className="sr-only">
                Shopify Store Domain
              </label>
              <input
                id="shop"
                type="text"
                value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value)}
                placeholder="your-store.myshopify.com"
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 dark:focus:ring-blue-500 sm:text-sm sm:leading-6 bg-white dark:bg-gray-900"
              />
            </div>
            <button
              type="submit"
              className="rounded-md bg-blue-600 dark:bg-blue-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 dark:hover:bg-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-500"
            >
              Connect Store
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </form>
      </div>
    </div>
  );
} 