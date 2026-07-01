'use client'

import { useQuery } from '@tanstack/react-query'
import { Pair } from '@/types/pair'

/** Fetches the full pair list from the /api/pairs endpoint */
export function useAllPairs() {
  return useQuery<Pair[]>({
    queryKey: ['pairs'],
    queryFn: async () => {
      const res = await fetch('/api/pairs')
      if (!res.ok) throw new Error('Failed to fetch pairs')
      return res.json()
    },
    staleTime: 30_000,
  })
}
