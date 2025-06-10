'use client';

import { useState } from 'react';
import { Tab } from '@headlessui/react';
import { CogIcon, ShoppingBagIcon, MegaphoneIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import ShopifyConnection from '@/components/settings/ShopifyConnection';

const tabs = [
  { name: 'General', icon: CogIcon },
  { name: 'Shopify', icon: ShoppingBagIcon },
  { name: 'Ad Platforms', icon: MegaphoneIcon },
];

export default function SettingsPage() {
  const [selectedTab, setSelectedTab] = useState(0);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Settings</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Manage your store connections and preferences
          </p>
        </div>

        <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
          <Tab.List className="flex space-x-1 rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
            {tabs.map((tab) => (
              <Tab
                key={tab.name}
                className={({ selected }) =>
                  clsx(
                    'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                    'ring-white/60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                    selected
                      ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-white/[0.12] hover:text-blue-600 dark:hover:text-blue-400'
                  )
                }
              >
                <div className="flex items-center justify-center space-x-2">
                  <tab.icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                </div>
              </Tab>
            ))}
          </Tab.List>

          <Tab.Panels className="mt-6">
            {/* General Settings */}
            <Tab.Panel>
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                      Account Settings
                    </h3>
                    <div className="mt-2 max-w-xl text-sm text-gray-500 dark:text-gray-400">
                      <p>Manage your account preferences and settings.</p>
                    </div>
                    {/* Add account settings form here */}
                  </div>
                </div>
              </div>
            </Tab.Panel>

            {/* Shopify Connection */}
            <Tab.Panel>
              <div className="space-y-6">
                <ShopifyConnection />
              </div>
            </Tab.Panel>

            {/* Ad Platforms */}
            <Tab.Panel>
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                      Ad Platform Connections
                    </h3>
                    <div className="mt-2 max-w-xl text-sm text-gray-500 dark:text-gray-400">
                      <p>Connect your advertising accounts to track ad spend and ROI.</p>
                    </div>
                    <div className="mt-6 space-y-4">
                      {/* Facebook Ads */}
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">Facebook Ads</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Connect your Facebook Ads account</p>
                        </div>
                        <button
                          type="button"
                          className="rounded-md bg-blue-600 dark:bg-blue-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 dark:hover:bg-blue-400"
                        >
                          Connect
                        </button>
                      </div>

                      {/* Google Ads */}
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">Google Ads</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Connect your Google Ads account</p>
                        </div>
                        <button
                          type="button"
                          className="rounded-md bg-blue-600 dark:bg-blue-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 dark:hover:bg-blue-400"
                        >
                          Connect
                        </button>
                      </div>

                      {/* TikTok Ads */}
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">TikTok Ads</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Connect your TikTok Ads account</p>
                        </div>
                        <button
                          type="button"
                          className="rounded-md bg-blue-600 dark:bg-blue-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 dark:hover:bg-blue-400"
                        >
                          Connect
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
} 