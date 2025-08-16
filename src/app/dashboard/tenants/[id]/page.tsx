"use client"

import { useParams, useSearchParams } from 'next/navigation'
import TenantDetail from '../../../../components/tenants/tenant-detail'
import TenantMoveForm from '../../../../components/tenants/tenant-move-form'

export default function TenantDetailPage() {
  const params = useParams<{ id: string }>()
  const search = useSearchParams()
  const propertyId = search.get('propertyId') || undefined
  const id = params?.id as string
  return (
    <div className="p-4 space-y-6">
      <TenantDetail id={id} />
      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-2">Move Tenant</h3>
        <TenantMoveForm tenantId={id} propertyId={propertyId} />
      </div>
    </div>
  )
}

