'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Spinner } from '@/components/ui/Spinner'
import { getErrorMessage } from '@/lib/errors'
import { COLLEGE_DOMAIN } from '@/lib/constants'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [yearOfStudy, setYearOfStudy] = useState('1')
  const [branchCourse, setBranchCourse] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  
  const { showToast } = useToast()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail.endsWith(COLLEGE_DOMAIN)) {
      showToast('Registration is restricted to UPES students (@stu.upes.ac.in)', 'error')
      return
    }
    
    if (!acceptedTerms) {
      showToast('You must accept the terms of service', 'error')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: fullName,
            year_of_study: parseInt(yearOfStudy),
            branch_course: branchCourse,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      })

      if (error) {
        console.error('Signup error:', JSON.stringify(error, null, 2), 'message:', error.message, 'status:', error.status, 'code:', error.code)
        showToast(error.message || 'Signup failed. Please try again.', 'error')
      } else {
        setSuccess(true)
        showToast('Registration successful! Check your email to verify.', 'success')
      }
    } catch (err) {
      console.error('Signup unexpected error:', err)
      showToast(getErrorMessage(err, 'An unexpected error occurred.'), 'error')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="glass-card p-8 rounded-2xl w-full text-center">
        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-white mb-2">Check your email</h2>
        <p className="text-slate-400 mb-6">
          We&apos;ve sent a verification link to <span className="text-white font-medium">{email}</span>.
        </p>
        <Link href="/login" className="btn-secondary w-full py-2.5 inline-block">
          Return to Login
        </Link>
      </div>
    )
  }

  return (
    <div className="glass-card p-8 rounded-2xl w-full">
      <h2 className="text-2xl font-semibold text-white mb-6">Create an account</h2>
      
      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input-field w-full"
            placeholder="John Doe"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">College Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field w-full"
            placeholder="you@stu.upes.ac.in"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Year of Study</label>
            <select
              value={yearOfStudy}
              onChange={(e) => setYearOfStudy(e.target.value)}
              className="input-field w-full appearance-none bg-surface-900 bg-slate-900 text-slate-200 border-white/10"
              required
            >
              {[1, 2, 3, 4, 5].map(year => (
                <option key={year} value={year} className="bg-slate-900 text-slate-200">Year {year}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Branch/Course</label>
            <input
              type="text"
              value={branchCourse}
              onChange={(e) => setBranchCourse(e.target.value)}
              className="input-field w-full"
              placeholder="e.g. B.Tech CSE"
            />
          </div>
        </div>

        <div className="flex items-start mt-2">
          <input
            type="checkbox"
            id="terms"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-1 mr-2 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-900"
          />
          <label htmlFor="terms" className="text-sm text-slate-400">
            I agree to the <Link href="/terms" className="text-emerald-400 hover:underline">Terms of Service</Link> and certify I am a student.
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-2.5 flex justify-center items-center mt-4"
        >
          {loading ? <Spinner size="sm" /> : 'Sign Up'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-400">
        Already have an account?{' '}
        <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
          Log in
        </Link>
      </div>
    </div>
  )
}
