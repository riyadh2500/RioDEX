import { createBrowserClient } from '@supabase/ssr'

let _client: ReturnType<typeof createBrowserClient> | null = null

/** Browser-side Supabase client (safe to import in Client Components).
 *  Lazily instantiated so the build never fails when env vars are absent. */
export function getSupabaseBrowser() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    )
  }
  return _client
}

/** Backwards-compatible alias */
export const supabase = {
  get client() { return getSupabaseBrowser() },
}
