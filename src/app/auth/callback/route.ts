import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Only allow same-site relative paths ("/listings", "/reset-password").
 * Rejects "//evil.com", "/\\evil.com" and "@evil.com", which would otherwise
 * turn `${origin}${next}` into an off-site redirect.
 */
function safeNextUrl(next: string | null, origin: string): URL {
  const fallback = new URL('/listings', origin)
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return fallback
  }
  // The URL parser drops tabs/newlines, so "/\t/evil.com" can still become "//evil.com":
  // re-check the origin after parsing.
  const url = new URL(next, origin)
  return url.origin === origin ? url : fallback
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNextUrl(searchParams.get('next'), origin)

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(next)
    }
  }

  // Return the user to an error page with some instructions
  return NextResponse.redirect(new URL('/login?error=Could%20not%20verify%20email', origin))
}
