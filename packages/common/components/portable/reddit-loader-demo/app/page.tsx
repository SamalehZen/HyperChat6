'use client'

import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useDemoRedditQuery } from '../queries'
import { SearchLoadingCard } from '../../reddit-loader-kit/src'

function DemoInner() {
  const { data, status } = useDemoRedditQuery()

  if (status === 'pending') {
    return <SearchLoadingCard color="#f97316" duration={1200} skeletonCount={3} />
  }

  return (
    <div className="space-y-3">
      {data?.map((p) => (
        <div key={p.id} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-900">
          <h3 className="font-medium text-sm">{p.title}</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{p.excerpt}</p>
        </div>
      ))}
    </div>
  )
}

export default function Page() {
  const [client] = React.useState(() => new QueryClient())
  return (
    <QueryClientProvider client={client}>
      <div className="max-w-2xl mx-auto p-6">
        <DemoInner />
      </div>
    </QueryClientProvider>
  )
}
