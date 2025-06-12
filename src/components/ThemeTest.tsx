'use client'

import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'

export default function ThemeTest() {
  const { theme, toggleTheme } = useTheme()
  
  console.log('ThemeTest rendering with theme:', theme)
  
  return (
    <div style={{ 
      minHeight: '100vh',
      width: '100%',
      backgroundColor: 'var(--color-background)',
      color: 'var(--color-text-primary)',
      transition: 'background-color 0.2s ease-in-out, color 0.2s ease-in-out'
    }}>
      <div className="p-4">
        <p className="mb-4">
          Current theme: {theme}
        </p>
        <Button onClick={toggleTheme}>
          Toggle Theme
        </Button>
      </div>
    </div>
  )
} 