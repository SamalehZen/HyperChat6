'use client'

import React from 'react'
import * as Accordion from '@radix-ui/react-accordion'
import { Spinner } from './Spinner'
import { BorderTrail } from './BorderTrail'

export type SearchLoadingCardProps = {
  text?: string
  color?: string
  duration?: number
  thickness?: number
  skeletonCount?: number
  useAccordion?: boolean
  className?: string
}

function join(...parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

function RedditLogo({ className, color = '#f97316' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden focusable={false} className={className}>
      <path
        fill={color}
        d="M10 0C4.478 0 0 4.478 0 10c0 5.523 4.478 10 10 10 5.523 0 10-4.477 10-10 0-5.522-4.477-10-10-10zm5.7 11.1c.1.1.1.1.1.2s0 .1-.1.2c-.599.901-1.899 1.4-3.6 1.4-1.3 0-2.5-.3-3.4-.9-.1-.1-.3-.1-.5-.2-.1 0-.1 0-.1-.1s-.1-.1-.1-.1c-.1-.1-.1-.1-.1-.2s0-.1.1-.2c.1-.1.2-.1.3-.1h.1c.9.5 2 .8 3.2.8 1.3 0 2.4-.3 3.3-.9h.1c.102-.1.202-.1.302-.1.099 0 .198 0 .298.1zm-9.6-2.3c0-.9.7-1.6 1.6-1.6.9 0 1.6.7 1.6 1.6 0 .9-.7 1.6-1.6 1.6-.9 0-1.6-.7-1.6-1.6zm6.8 0c0-.9.7-1.6 1.6-1.6.9 0 1.6.7 1.6 1.6 0 .9-.7 1.6-1.6 1.6-.9 0-1.6-.7-1.6-1.6z"
      />
    </svg>
  )
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={join('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs', className)}>
      {children}
    </span>
  )
}

export function SearchLoadingCard({
  text = 'Searching Reddit...',
  color = '#f97316',
  duration = 1200,
  thickness = 2,
  skeletonCount = 3,
  useAccordion = true,
  className,
}: SearchLoadingCardProps) {
  const Header = (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-orange-50 dark:bg-orange-900/20">
          <RedditLogo className="h-3.5 w-3.5" color={color} />
        </div>
        <h2 className="font-medium text-sm">Reddit Results</h2>
      </div>
      <div className="flex items-center gap-2">
        <Badge className="rounded-full text-xs px-2.5 py-0.5 bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-500">0</Badge>
      </div>
    </div>
  )

  const Body = (
    <div className="p-3 space-y-3 bg-white dark:bg-neutral-900 border-x border-b border-neutral-200 dark:border-neutral-800 rounded-b-xl">
      <div className="flex items-center gap-2">
        <Badge className="rounded-full text-xs px-3 py-1 bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-500">
          <Spinner type="ring" size={14} color={color} className="mr-1" />
          {text}
        </Badge>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-[320px] bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-900/20 animate-pulse flex items-center justify-center">
                <RedditLogo className="h-5 w-5 opacity-40" color={color} />
              </div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse w-1/2" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
              <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse w-5/6" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const Card = (
    <div
      className={join(
        'relative w-full my-4 overflow-hidden rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800',
        className,
      )}
      role="status"
      aria-busy="true"
    >
      <BorderTrail color={color} thickness={thickness} duration={duration} rounded={12} inset={0} />
      <div className="py-3 px-4">{Header}</div>
      {Body}
    </div>
  )

  if (!useAccordion) return Card

  return (
    <Accordion.Root type="single" collapsible defaultValue="reddit_search" className="w-full">
      <Accordion.Item value="reddit_search" className="border-none">
        <Accordion.Header asChild>
          <Accordion.Trigger className="py-3 px-4 rounded-xl hover:no-underline bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 data-[state=open]:rounded-b-none w-full text-left">
            {Header}
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content asChild>{Card}</Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  )
}

export default SearchLoadingCard
