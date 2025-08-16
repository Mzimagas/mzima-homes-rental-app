'use client'

import { useEffect, useState } from 'react'
import { withAuth } from '../../../lib/withAuth'
import supabase from '../../../lib/supabase-client'

function SecuritySettings() {
  const [enrolled, setEnrolled] = useState(false)
  const [uri, setUri] = useState<string | null>(null)
  const [ticket, setTicket] = useState<string | null>(null)
  const [otp, setOtp] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    // Check existing factors
    supabase.auth.mfa.listFactors().then(({ data }: { data: any }) => {
      const totp = data.totp?.[0]
      if (totp && totp.status === 'verified') setEnrolled(true)
    })
  }, [])

  const startEnroll = async () => {
    setMessage('')
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
    if (error) { setMessage('Failed to start enrollment'); return }
    setUri(data.totp?.uri || null)
    setTicket(data.id)
  }

  const verifyEnroll = async () => {
    setMessage('')
    if (!ticket) return
    const { error } = await supabase.auth.mfa.verify({ factorId: ticket, code: otp })
    if (error) { setMessage('Invalid code. Please try again.'); return }
    setEnrolled(true)
    setUri(null)
    setTicket(null)
    setOtp('')
    setMessage('MFA enabled successfully')
  }

  const disableMfa = async () => {
    setMessage('')
    const { data } = await supabase.auth.mfa.listFactors()
    const totp = data.totp?.[0]
    if (!totp) return
    await supabase.auth.mfa.unenroll({ factorId: totp.id })
    setEnrolled(false)
    setMessage('MFA disabled')
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Security Settings</h1>
      {message && <div className="text-green-600 mb-4">{message}</div>}
      {!enrolled ? (
        <div>
          <p className="mb-4 text-gray-700">Enable two-factor authentication (TOTP) for extra security.</p>
          {!uri ? (
            <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={startEnroll}>Start Enrollment</button>
          ) : (
            <div className="space-y-4">
              <p className="text-sm">Scan this URI with your authenticator app:</p>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">{uri}</pre>
              <input className="border rounded px-3 py-2 w-full" placeholder="Enter 6-digit code" value={otp} onChange={(e)=>setOtp(e.target.value)} />
              <button className="px-4 py-2 bg-green-600 text-white rounded" onClick={verifyEnroll}>Verify</button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-gray-700">MFA is currently enabled for your account.</p>
          <button className="px-4 py-2 bg-red-600 text-white rounded" onClick={disableMfa}>Disable MFA</button>
        </div>
      )}
    </div>
  )
}

export default withAuth(SecuritySettings)

