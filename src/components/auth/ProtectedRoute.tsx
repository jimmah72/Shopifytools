'use client'

import { useAuth } from '@/contexts/AuthContext'
import { LoginForm } from './LoginForm'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <LoginForm />
  }

  return <>{children}</>
} 