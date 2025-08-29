'use client'

import { useEffect } from 'react'
import { initAnalytics } from '../lib/analytics'

export default function ClientAnalytics() {
  useEffect(() => {
    try {
      initAnalytics()
    } catch (error) {
          }
  }, [])
  return null
}
