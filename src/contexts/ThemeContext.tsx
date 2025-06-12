'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    // Check if theme was previously saved
    const savedTheme = localStorage.getItem('theme') as Theme
    console.log('Initial theme load:', { savedTheme, systemDark: window.matchMedia('(prefers-color-scheme: dark)').matches })
    if (savedTheme) {
      setTheme(savedTheme)
    } else {
      // Default to dark mode instead of checking system preference
      setTheme('dark')
    }
  }, [])

  useEffect(() => {
    // Update document class when theme changes
    console.log('Theme changed to:', theme)
    console.log('Previous classes:', document.documentElement.classList.toString())
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(theme)
    console.log('Updated classes:', document.documentElement.classList.toString())
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    console.log('Toggle theme clicked, current theme:', theme)
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
} 