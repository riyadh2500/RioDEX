'use client'

import { useQuery } from '@tanstack/react-query'
import { Token } from '@/types/token'
import { useTokenListStore } from '@/stores/useTokenListStore'
import { useEffect } from 'react'

/** Fetches tokens from /api/tokens and seeds the token list store */
export function useAllTokens() {
  const setTokens = useTokenListStore((s) => s.setTokens)

  const query = useQuery<Token[]>({
    queryKey: ['tokens'],
    queryFn: async () => {
      const res = await fetch('/api/tokens')
      if (!res.ok) throw new Error('Failed to fetch tokens')
      return res.json()
    },
    staleTime: 60_000,
  })

  useEffect(() => {
    if (query.data) setTokens(query.data)
  }, [query.data, setTokens])

  return query
}
