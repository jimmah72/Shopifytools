import { ReactNode } from 'react'
import clsx from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 p-6 shadow-sm ${className}`}
    >
      {children}
    </div>
  )
} 