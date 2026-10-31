'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Spinner } from '@/components/ui/Spinner'
import { getErrorMessage } from '@/lib/errors'

type LinkStatus = 'checking' | 'ready' | 'invalid'

// Declared at module level: a component created inside render is a new type on every
// render, which remounted the password inputs and dropped focus on each keystroke.
function EyeIcon({ show }: { show: boolean }) {
  return show ? (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [linkStatus, setLinkStatus] = useState<LinkStatus>('checking')
  const router = useRouter()
  const { showToast } = useToast()
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    // The reset email goes through /auth/callback, which exchanges the one-time code for a
    // session before sending the user here. So a signed-in user means the link was valid.
    let cancelled = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && event === 'PASSWORD_RECOVERY') setLinkStatus('ready')
    })

    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setLinkStatus(data.user ? 'ready' : 'invalid')
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [supabase])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      showToast('Passwords do not match.', 'error')
      return
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters.', 'error')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        showToast(error.message, 'error')
      } else {
        showToast('Password updated successfully! Redirecting to login...', 'success')
        // Sign out so they log in fresh with the new password
        await supabase.auth.signOut()
        setTimeout(() => router.push('/login'), 1500)
      }
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to update password.'), 'error')
    } finally {
      setLoading(false)
    }
  }

  if (linkStatus === 'invalid') {
    return (
      <div className="glass-card p-8 rounded-2xl w-full text-center">
        <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-white mb-2">Invalid or expired link</h2>
        <p className="text-slate-400 mb-6">
          This password reset link is invalid or has expired. Please request a new one.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="btn-primary w-full py-2.5"
        >
          Back to Login
        </button>
      </div>
    )
  }

  if (linkStatus === 'checking') {
    return (
      <div className="glass-card p-8 rounded-2xl w-full text-center">
        <Spinner size="lg" />
        <p className="text-slate-400 mt-4">Verifying your reset link...</p>
      </div>
    )
  }

  return (
    <div className="glass-card p-8 rounded-2xl w-full">
      <h2 className="text-2xl font-semibold text-white mb-2">Set a new password</h2>
      <p className="text-slate-400 text-sm mb-6">Enter your new password below.</p>
      
      <form onSubmit={handleReset} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            New Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field w-full pr-11"
              placeholder="••••••••"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              tabIndex={-1}
            >
              <EyeIcon show={showPassword} />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Confirm Password
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-field w-full pr-11"
              placeholder="••••••••"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              tabIndex={-1}
            >
              <EyeIcon show={showConfirmPassword} />
            </button>
          </div>
          {confirmPassword && password !== confirmPassword && (
            <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !password || !confirmPassword}
          className="btn-primary w-full py-2.5 flex justify-center items-center mt-2"
        >
          {loading ? <Spinner size="sm" /> : 'Update Password'}
        </button>
      </form>
    </div>
  )
}
