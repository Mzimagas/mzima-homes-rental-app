'use client'

import { memo } from 'react'

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  stroke?: string
  fill?: string
}

function SparklineBase({
  data,
  width = 100,
  height = 30,
  stroke = '#16a34a',
  fill = 'none',
}: SparklineProps) {
  if (!data || data.length === 0) {
    return <svg width={width} height={height} aria-hidden="true" />
  }

  const max = Math.max(...data)
  const min = Math.min(...data)
  const norm = (v: number) =>
    max === min ? 0.5 * height : height - ((v - min) / (max - min)) * height
  const step = width / Math.max(1, data.length - 1)

  const points = data.map((v, i) => `${i * step},${norm(v)}`).join(' ')

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {fill !== 'none' && <polyline points={points} fill={fill} stroke="none" />}
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
    </svg>
  )
}

export default memo(SparklineBase)
