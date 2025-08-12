'use client'

import { useMemo } from 'react'
import { strengthScore } from '../lib/password'

export default function PasswordStrength({ value }: { value: string }) {
  const { score, label } = useMemo(() => strengthScore(value), [value])
  const colors = ['bg-red-400','bg-orange-400','bg-yellow-400','bg-green-500','bg-green-700']
  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded ${i <= score ? colors[score] : 'bg-gray-200'}`}></div>
        ))}
      </div>
      <div className="text-xs text-gray-600 mt-1">Strength: {label}</div>
    </div>
  )
}

