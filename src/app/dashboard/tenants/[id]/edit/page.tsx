"use client"

import { useParams, useRouter } from 'next/navigation'
import TenantEditForm from '../../../../../components/tenants/tenant-edit-form'

export default function EditTenantPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params?.id as string

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Edit Tenant</h1>
      <TenantEditForm id={id} onSuccess={() => router.push(`/dashboard/tenants/${id}`)} />
    </div>
  )
}

