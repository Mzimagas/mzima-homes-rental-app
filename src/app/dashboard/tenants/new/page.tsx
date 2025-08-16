"use client"

import { useRouter, useSearchParams } from 'next/navigation'
import TenantForm from '../../../../components/tenants/tenant-form'

export default function NewTenantPage() {
  const params = useSearchParams()
  const router = useRouter()
  const propertyId = params.get('propertyId') || undefined
  const unitId = params.get('unitId') || undefined
  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">New Tenant</h1>
      <TenantForm
        defaultPropertyId={propertyId}
        defaultUnitId={unitId}
        onSuccess={() => {
          const sp = new URLSearchParams()
          if (propertyId) sp.set('propertyId', propertyId)
          router.push(`/dashboard/tenants${sp.toString() ? `?${sp}` : ''}`)
        }}
      />
    </div>
  )
}

