'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'

export type SpinnerProps = {
  type?: 'ring' | 'icon'
  size?: number
  color?: string
  className?: string
  'aria-label'?: string
}

function join(...parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function Spinner({ type = 'ring', size = 16, color = '#f97316', className, 'aria-label': ariaLabel }: SpinnerProps) {
  if (type === 'icon') {
    return (
      <span role="status" aria-live="polite" aria-label={ariaLabel || 'Loading'} className={className}>
        <Loader2 className={join('animate-spin', className)} size={size} color={color} />
      </span>
    )
  }

  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderColor: color,
    borderTopColor: 'transparent',
  }
  return (
    <span role="status" aria-live="polite" aria-label={ariaLabel || 'Loading'} className={className}>
      <div className="inline-block rounded-full border-2 animate-spin" style={style} />
    </span>
  )
}

export default Spinner
