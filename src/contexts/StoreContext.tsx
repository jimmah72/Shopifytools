'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface Store {
  id: string
  name: string
  domain: string
  accessToken: string
}

interface StoreContextType {
  store: Store | null
  setStore: (store: Store | null) => void
  loading: boolean
}

const StoreContext = createContext<StoreContextType | undefined>(undefined)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStore = async () => {
      try {
        const response = await fetch('/api/store')
        if (response.ok) {
          const data = await response.json()
          setStore(data)
        }
      } catch (error) {
        console.error('Error fetching store:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStore()
  }, [])

  return (
    <StoreContext.Provider value={{ store, setStore, loading }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const context = useContext(StoreContext)
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
} 