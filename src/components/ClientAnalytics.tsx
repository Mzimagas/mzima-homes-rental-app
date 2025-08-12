'use client'

import { useEffect } from 'react'
import { initAnalytics } from '../lib/analytics'

export default function ClientAnalytics() {
  useEffect(() => { initAnalytics() }, [])
  return null
}

