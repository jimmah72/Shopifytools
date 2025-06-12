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
  refreshStore: () => Promise<void>
}

const StoreContext = createContext<StoreContextType | undefined>(undefined)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStore = async () => {
    console.log('StoreContext - Fetching store...')
    try {
      const response = await fetch('/api/store')
      console.log('StoreContext - Store API response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('StoreContext - Store data:', data)
        setStore(data)
      } else {
        const errorData = await response.json()
        console.error('StoreContext - Store API error:', errorData)
        setStore(null)
      }
    } catch (error) {
      console.error('StoreContext - Error fetching store:', error)
      setStore(null)
    } finally {
      console.log('StoreContext - Setting loading to false')
      setLoading(false)
    }
  }

  const refreshStore = async () => {
    setLoading(true)
    await fetchStore()
  }

  useEffect(() => {
    console.log('StoreContext - Initial render, calling fetchStore')
    fetchStore()
  }, [])

  const contextValue = {
    store,
    setStore: (newStore: Store | null) => {
      console.log('StoreContext - Setting new store:', newStore)
      setStore(newStore)
    },
    loading,
    refreshStore
  }

  console.log('StoreContext - Current state:', { store, loading })

  return (
    <StoreContext.Provider value={contextValue}>
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