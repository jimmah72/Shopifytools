import { ReactNode } from 'react'
import { ArrowUpward as ArrowUpIcon, ArrowDownward as ArrowDownIcon } from '@mui/icons-material'
import clsx from 'clsx'

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  icon?: ReactNode
  prefix?: string
  suffix?: string
}

export default function MetricCard({
  title,
  value,
  change,
  icon,
  prefix = '',
  suffix = '',
}: MetricCardProps) {
  const showChange = typeof change === 'number'
  const isPositive = showChange && change > 0
  const isNegative = showChange && change < 0

  return (
    <div className="bg-white shadow rounded-lg px-6 py-5">
      <div className="flex items-center">
        {icon && (
          <div className="flex-shrink-0">
            <div className="h-12 w-12 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center">
              {icon}
            </div>
          </div>
        )}
        <div className={clsx(icon && 'ml-5')}>
          <div className="text-sm font-medium text-gray-500">{title}</div>
          <div className="mt-1 flex items-baseline">
            <div className="text-2xl font-semibold text-gray-900">
              {prefix}
              {value}
              {suffix}
            </div>
            {showChange && (
              <div
                className={clsx(
                  'ml-2 flex items-baseline text-sm font-semibold',
                  {
                    'text-green-600': isPositive,
                    'text-red-600': isNegative,
                    'text-gray-500': change === 0,
                  }
                )}
              >
                {isPositive && (
                  <ArrowUpIcon sx={{ fontSize: 16 }} className="flex-shrink-0 self-center text-green-500" />
                )}
                {isNegative && (
                  <ArrowDownIcon sx={{ fontSize: 16 }} className="flex-shrink-0 self-center text-red-500" />
                )}
                <span className="ml-1">
                  {Math.abs(change)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 