'use client'

import { HomeIcon, ChartBarIcon, ShoppingBagIcon, CurrencyDollarIcon, MegaphoneIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Orders', href: '/orders', icon: ShoppingBagIcon },
  { name: 'Products', href: '/products', icon: ChartBarIcon },
  { name: 'Ad Spend', href: '/ad-spend', icon: MegaphoneIcon },
  { name: 'Profit', href: '/profit', icon: CurrencyDollarIcon },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col bg-gray-900 w-64">
      <div className="flex h-16 shrink-0 items-center px-6">
        <h1 className="text-xl font-bold text-white">Shopify Analytics</h1>
      </div>
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={clsx(
                      pathname === item.href
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800',
                      'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold mx-2'
                    )}
                  >
                    <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        </ul>
      </nav>
    </div>
  )
} 