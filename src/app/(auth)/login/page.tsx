'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Spinner } from '@/components/ui/Spinner'
import { getErrorMessage } from '@/lib/errors'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const router = useRouter()
  const { showToast } = useToast()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) {
          showToast('Please confirm your email before logging in. Check your inbox for the verification link.', 'error')
        } else {
          showToast(error.message, 'error')
        }
      } else {
        showToast('Successfully logged in!', 'success')
        router.push('/listings')
        router.refresh()
      }
    } catch {
      showToast('An unexpected error occurred.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      showToast('Please enter your email address.', 'error')
      return
    }
    setResetLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // The email link carries a one-time code; /auth/callback exchanges it for a
        // session and then forwards to the reset page (which lives at /reset-password).
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })

      if (error) {
        showToast(error.message, 'error')
      } else {
        setResetSent(true)
        showToast('Password reset email sent! Check your inbox.', 'success')
      }
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to send reset email.'), 'error')
    } finally {
      setResetLoading(false)
    }
  }

  // Reset email sent confirmation
  if (resetSent) {
    return (
      <div className="glass-card p-8 rounded-2xl w-full text-center">
        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-white mb-2">Check your email</h2>
        <p className="text-slate-400 mb-6">
          We&apos;ve sent a password reset link to <span className="text-white font-medium">{email}</span>.
        </p>
        <button
          onClick={() => { setResetSent(false); setResetMode(false) }}
          className="btn-secondary w-full py-2.5"
        >
          Back to Login
        </button>
      </div>
    )
  }

  // Forgot password form
  if (resetMode) {
    return (
      <div className="glass-card p-8 rounded-2xl w-full">
        <h2 className="text-2xl font-semibold text-white mb-2">Reset your password</h2>
        <p className="text-slate-400 text-sm mb-6">Enter your college email and we&apos;ll send you a reset link.</p>
        
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              College Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field w-full"
              placeholder="you@stu.upes.ac.in"
              required
            />
          </div>

          <button
            type="submit"
            disabled={resetLoading}
            className="btn-primary w-full py-2.5 flex justify-center items-center"
          >
            {resetLoading ? <Spinner size="sm" /> : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          Remember your password?{' '}
          <button onClick={() => setResetMode(false)} className="text-emerald-400 hover:text-emerald-300 font-medium">
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  // Normal login form
  return (
    <div className="glass-card p-8 rounded-2xl w-full">
      <h2 className="text-2xl font-semibold text-white mb-6">Welcome back</h2>
      
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            College Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field w-full"
            placeholder="you@stu.upes.ac.in"
            required
          />
          <p className="text-xs text-slate-500 mt-1">Please use your college email address.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field w-full pr-11"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          <div className="mt-1 text-right">
            <button
              type="button"
              onClick={() => setResetMode(true)}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
            >
              Forgot password?
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-2.5 flex justify-center items-center"
        >
          {loading ? <Spinner size="sm" /> : 'Log In'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-400">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-emerald-400 hover:text-emerald-300 font-medium">
          Sign up
        </Link>
      </div>
    </div>
  )
}
