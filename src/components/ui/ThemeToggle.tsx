'use client'

import { LightMode as SunIcon, DarkMode as MoonIcon } from '@mui/icons-material'
import { useTheme } from '@/contexts/ThemeContext'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="rounded-lg p-2.5 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
      aria-label="Toggle dark mode"
    >
      {theme === 'dark' ? (
        <SunIcon sx={{ fontSize: 20 }} />
      ) : (
        <MoonIcon sx={{ fontSize: 20 }} />
      )}
    </button>
  )
} 