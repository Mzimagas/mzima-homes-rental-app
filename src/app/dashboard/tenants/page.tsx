"use client"

import { useSearchParams } from 'next/navigation'
import TenantList from '../../../components/tenants/tenant-list'

export default function TenantsPage() {
  const params = useSearchParams()
  const propertyId = params.get('propertyId') || undefined
  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Tenants</h1>
      <TenantList defaultPropertyId={propertyId} />
    </div>
  )
}

