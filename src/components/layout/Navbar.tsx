'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { useToast } from '@/components/ui/Toast'

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const { showToast } = useToast()

  useEffect(() => {
    // Re-checked on every auth change so the Admin link disappears after sign-out
    // (or a switch to a non-admin account). It is only a UI hint; RLS enforces access.
    const loadAdminFlag = async (userId: string | undefined) => {
      if (!userId) {
        setIsAdmin(false)
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single()
      setIsAdmin(!!data?.is_admin)
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      loadAdminFlag(user?.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      // Deferred: Supabase calls made inside this callback can deadlock the auth lock.
      setTimeout(() => loadAdminFlag(session?.user?.id), 0)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      showToast(error.message, 'error')
    } else {
      showToast('Logged out successfully', 'success')
      setUserMenuOpen(false)
      router.push('/login')
    }
  }

  const navLinks = [
    { name: 'Browse', href: '/listings', exact: true },
    { name: 'Sell', href: '/listings/create', exact: true },
    { name: 'Chat', href: '/chat', exact: false },
  ]

  const isActiveLink = (link: { href: string; exact: boolean }) => {
    if (link.exact) {
      return pathname === link.href || pathname === link.href + '/'
    }
    return pathname.startsWith(link.href)
  }

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0">
              <span className="text-xl font-bold gradient-text tracking-tight">GoodsMandi</span>
            </Link>
            <div className="hidden md:block ml-10">
              <div className="flex items-baseline space-x-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActiveLink(link)
                        ? 'bg-white/10 text-white'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6">
              {user ? (
                <div ref={userMenuRef} className="relative ml-3">
                  <div>
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex max-w-xs items-center rounded-full bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                    >
                      <span className="sr-only">Open user menu</span>
                      <div className="h-8 w-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center border border-emerald-500/50">
                        {user.email?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    </button>
                  </div>
                  {userMenuOpen && (
                    <div className="absolute right-0 z-50 mt-2 w-48 origin-top-right rounded-xl bg-slate-900 border border-slate-700 py-1 shadow-2xl shadow-black/50 ring-1 ring-black ring-opacity-5 focus:outline-none backdrop-blur-none">
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Profile
                      </Link>
                      <Link
                        href="/listings/my"
                        className="block px-4 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        My Listings
                      </Link>
                      {isAdmin && (
                        <Link
                          href="/admin"
                          className="block px-4 py-2 text-sm text-emerald-400 hover:bg-white/5"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          Admin Dashboard
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex space-x-4">
                  <Link href="/login" className="btn-ghost px-4 py-2 text-sm">
                    Log in
                  </Link>
                  <Link href="/signup" className="btn-primary px-4 py-2 text-sm">
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-white focus:outline-none"
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div ref={mobileMenuRef} className="md:hidden glass-card border-t-0">
          <div className="space-y-1 px-2 pb-3 pt-2 sm:px-3">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block rounded-md px-3 py-2 text-base font-medium ${
                  isActiveLink(link)
                    ? 'bg-white/10 text-white'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>
          {user ? (
            <div className="border-t border-white/10 pb-3 pt-4">
              <div className="flex items-center px-5">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center border border-emerald-500/50">
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                </div>
                <div className="ml-3">
                  <div className="text-sm font-medium leading-none text-slate-400">{user.email}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1 px-2">
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-md px-3 py-2 text-base font-medium text-slate-400 hover:bg-white/5 hover:text-white"
                >
                  Profile
                </Link>
                <Link
                  href="/listings/my"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-md px-3 py-2 text-base font-medium text-slate-400 hover:bg-white/5 hover:text-white"
                >
                  My Listings
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-md px-3 py-2 text-base font-medium text-emerald-400 hover:bg-white/5"
                  >
                    Admin Dashboard
                  </Link>
                )}
                <button
                  onClick={() => {
                    handleLogout()
                    setMobileMenuOpen(false)
                  }}
                  className="block w-full text-left rounded-md px-3 py-2 text-base font-medium text-red-400 hover:bg-white/5"
                >
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <div className="border-t border-white/10 pb-3 pt-4 px-5 flex flex-col space-y-3">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-ghost w-full justify-center"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-primary w-full justify-center"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
