'use client'

import React from 'react'

export type SkeletonProps = {
  className?: string
  style?: React.CSSProperties
}

function join(...parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function Skeleton({ className, style }: SkeletonProps) {
  return <div className={join('bg-neutral-200 dark:bg-neutral-800 animate-pulse', className)} style={style} />
}

export type SkeletonLineProps = {
  width?: string | number
  height?: number
  className?: string
  style?: React.CSSProperties
}

export function SkeletonLine({ width = '100%', height = 12, className, style }: SkeletonLineProps) {
  return <Skeleton className={join('rounded', className)} style={{ width, height, ...style }} />
}

export type SkeletonBlockProps = {
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
}

export function SkeletonBlock({ className, style, children }: SkeletonBlockProps) {
  return (
    <div className={join('relative overflow-hidden rounded-md', className)} style={style}>
      <Skeleton className="absolute inset-0" />
      {children}
    </div>
  )
}

export default Skeleton
