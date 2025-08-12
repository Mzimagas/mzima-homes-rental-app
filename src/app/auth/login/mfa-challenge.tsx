'use client'

import { useState } from 'react'

export default function MfaChallenge({ onVerify, onCancel }: { onVerify: (code: string)=>void, onCancel: ()=>void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!code) { setError('Enter the 6-digit code'); return }
    onVerify(code)
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input className="w-full border rounded px-3 py-2" placeholder="6-digit code" value={code} onChange={(e)=>setCode(e.target.value)} />
      {error && <div className="text-red-600 text-sm" role="alert">{error}</div>}
      <div className="flex gap-2">
        <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded">Verify</button>
        <button type="button" className="px-3 py-2 border rounded" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

