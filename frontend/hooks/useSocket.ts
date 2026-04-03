'use client'

import { useEffect } from 'react'

export function useSocket() {
  useEffect(() => {
    // Socket.io connection will be implemented in Phase 4
  }, [])

  return {
    connected: false,
  }
}
