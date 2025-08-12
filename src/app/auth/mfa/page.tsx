'use client'

import { useEffect, useState } from 'react'
import { withAuth } from '../../../lib/withAuth'
import { supabase } from '../../../lib/supabase-client'

function MfaPage() {
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)

  useEffect(() => {
    (async () => {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const factor = factors.totp?.find(f=>f.status==='verified') || factors.totp?.[0]
      if (factor) {
        await supabase.auth.mfa.challenge({ factorId: factor.id })
        setFactorId(factor.id)
      } else {
        setError('No MFA factor found for your account.')
      }
    })()
  }, [])

  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!factorId) return
    const { error } = await supabase.auth.mfa.verify({ factorId, code })
    if (error) setError('Invalid code, please try again.')
    else setOk(true)
  }

  if (ok) return <div className="p-6">MFA complete. <a className="text-blue-600" href="/dashboard">Go to Dashboard</a></div>

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <form onSubmit={verify} className="bg-white p-6 rounded shadow space-y-3 w-full max-w-sm">
        <h1 className="text-xl font-semibold">Verify MFA</h1>
        <input className="w-full border rounded px-3 py-2" value={code} onChange={(e)=>setCode(e.target.value)} placeholder="6-digit code" />
        {error && <div className="text-red-600 text-sm" role="alert">{error}</div>}
        <button className="px-4 py-2 bg-blue-600 text-white rounded" type="submit">Verify</button>
      </form>
    </div>
  )
}

export default withAuth(MfaPage)

