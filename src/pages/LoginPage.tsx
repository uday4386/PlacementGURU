import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import {
  clearAuthSession,
  getPortalPath,
  roleDefaults,
  setAuthSession,
  type UserRole,
} from '../lib/auth'
import { initializeStore } from '../lib/placeproStore'
import { cn } from '../lib/utils'
import { DEFAULT_BRANCH_OPTIONS } from '../lib/branchUtils'

const roles: UserRole[] = ['admin', 'student', 'coordinator']

function getInitialRole(params: URLSearchParams): UserRole {
  const param = params.get('role')
  if (param === 'admin' || param === 'student' || param === 'coordinator') {
    return param
  }
  return 'student'
}

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [selectedRole, setSelectedRole] = useState<UserRole>(() => getInitialRole(searchParams))
  const defaults = roleDefaults[selectedRole]

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // 2FA states
  const [loginStep, setLoginStep] = useState<'password' | 'setup-2fa' | 'verify-2fa'>('password')
  const [tempToken, setTempToken] = useState<string | null>(null)
  const [totpSecret, setTotpSecret] = useState<string | null>(null)
  const [qrCodeData, setQrCodeData] = useState<string | null>(null)
  const [otpCode, setOtpCode] = useState('')
  const [securityQuestion, setSecurityQuestion] = useState('What is your favorite food?')
  const [securityAnswer, setSecurityAnswer] = useState('')
  
  // Forgot password states
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [forgotPasswordStep, setForgotPasswordStep] = useState<1 | 2>(1)
  const [fetchedSecurityQuestion, setFetchedSecurityQuestion] = useState<string | null>(null)
  const [resetRoll, setResetRoll] = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [resetDob, setResetDob] = useState('')
  const [resetBranch, setResetBranch] = useState('Computer Science Engineering')
  const [resetPassword, setResetPassword] = useState('')
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null)
  const [resetErrorMsg, setResetErrorMsg] = useState<string | null>(null)
  const [isResetting, setIsResetting] = useState(false)

  const [stats, setStats] = useState({ students: 0, drives: 0, companies: 0, placements: 0 })

  useEffect(() => {
    fetch('/api/public-stats')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStats({
            students: data.students,
            drives: data.drives,
            companies: data.companies,
            placements: data.placements,
          })
        }
      })
      .catch((err) => console.error('Error fetching statistics:', err))
  }, [])

  // Clear any stale session when login page mounts so users start fresh
  useEffect(() => {
    clearAuthSession()
  }, [])

  // Sync login inputs when selected role changes
  useEffect(() => {
    setUsername('')
    setPassword('')
    setErrorMsg(null)
  }, [selectedRole])

  async function handleSignIn() {
    setErrorMsg(null)
    const emailToUse = username
    const passwordToUse = password

    if (!emailToUse || !passwordToUse) {
      setErrorMsg('Please enter both username/roll number and password.')
      return
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToUse, password: passwordToUse }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Invalid credentials or connection issue.')
        return
      }

      if (data.session.role !== selectedRole) {
        setErrorMsg(`Role mismatch. Credentials belong to a ${data.session.role} account.`)
        return
      }

      if (data.requireSetup) {
        setTempToken(data.token)
        const setupRes = await fetch('/api/auth/setup-2fa', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${data.token}` }
        })
        const setupData = await setupRes.json()
        if (setupData.success) {
          setTotpSecret(setupData.secret)
          setQrCodeData(setupData.qrCodeImage)
          setLoginStep('setup-2fa')
        } else {
          setErrorMsg(setupData.error || 'Failed to setup 2FA.')
        }
        return
      }

      if (data.require2FA) {
        setTempToken(data.token)
        setLoginStep('verify-2fa')
        return
      }

      if (data.session?.academicYear) {
        localStorage.setItem('placepro-selected-academic-year', data.session.academicYear)
      }
      setAuthSession(data.session, data.token)
      
      // Load and cache all database rows using the newly acquired JWT
      await initializeStore()

      navigate(getPortalPath(selectedRole), { replace: true })
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during authentication.')
    }
  }

  async function handleVerify2FA(isSetup: boolean) {
    setErrorMsg(null)
    if (!otpCode || otpCode.length !== 6) {
      setErrorMsg('Please enter a valid 6-digit code.')
      return
    }
    
    try {
      const endpoint = isSetup ? '/api/auth/enable-2fa' : '/api/auth/verify-login-2fa'
      
      if (isSetup && (!securityQuestion || !securityAnswer.trim())) {
        setErrorMsg('Please select a security question and provide an answer.')
        return
      }
      
      const body = isSetup ? { code: otpCode, secret: totpSecret, securityQuestion, securityAnswer } : { code: otpCode }
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tempToken}`
        },
        body: JSON.stringify(body)
      })
      
      const data = await res.json()
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Invalid verification code.')
        return
      }

      if (data.session?.academicYear) {
        localStorage.setItem('placepro-selected-academic-year', data.session.academicYear)
      }
      setAuthSession(data.session, data.token)
      await initializeStore()
      navigate(getPortalPath(selectedRole), { replace: true })
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during verification.')
    }
  }

  async function handleResetPassword() {
    setResetErrorMsg(null)
    setResetSuccessMsg(null)

    if (selectedRole === 'coordinator') {
      if (!resetEmail || !resetBranch || !resetPassword) {
        setResetErrorMsg('Please fill in all fields.')
        return
      }

      setIsResetting(true)
      try {
        const res = await fetch('/api/auth/coordinator-forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: resetEmail,
            department: resetBranch,
            newPassword: resetPassword,
          }),
        })

        const data = await res.json()
        if (!res.ok || !data.success) {
          setResetErrorMsg(data.error || 'Failed to reset password. Please try again.')
          return
        }

        setResetSuccessMsg('Password reset successfully! You can now sign in with your new password.')
        setResetEmail('')
        setResetPassword('')
        setResetBranch('Computer Science Engineering')

        setTimeout(() => {
          setIsForgotPassword(false)
          setResetSuccessMsg(null)
        }, 4000)
      } catch (err: any) {
        setResetErrorMsg(err.message || 'An error occurred during password reset.')
      } finally {
        setIsResetting(false)
      }
    } else {
      // Student forgot password flow is now 2 steps
      if (forgotPasswordStep === 1) {
        if (!resetRoll) {
          setResetErrorMsg('Please enter your Roll Number first.')
          return
        }
        setIsResetting(true)
        try {
          const res = await fetch('/api/auth/get-security-question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rollNumber: resetRoll })
          })
          const data = await res.json()
          if (res.ok && data.success) {
            setFetchedSecurityQuestion(data.question)
            setForgotPasswordStep(2)
          } else {
            setResetErrorMsg(data.error || 'Failed to fetch security question')
          }
        } catch (err: any) {
          setResetErrorMsg(err.message || 'Network error')
        } finally {
          setIsResetting(false)
        }
        return
      }

      if (!resetRoll || !resetEmail || !resetDob || !securityAnswer || !resetPassword) {
        setResetErrorMsg('Please fill in all fields.')
        return
      }

      setIsResetting(true)
      try {
        const res = await fetch('/api/auth/student-forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rollNumber: resetRoll,
            email: resetEmail,
            dateOfBirth: resetDob,
            securityAnswer: securityAnswer,
            newPassword: resetPassword
          })
        })

        const data = await res.json()
        if (!res.ok || !data.success) {
          setResetErrorMsg(data.error || 'Failed to reset password. Please try again.')
          return
        }

        setResetSuccessMsg('Password reset successfully! You can now sign in with your new password.')
        setResetRoll('')
        setResetEmail('')
        setResetDob('')
        setResetPassword('')
        setSecurityAnswer('')
        setForgotPasswordStep(1)
        setTimeout(() => {
          setIsForgotPassword(false)
          setResetSuccessMsg(null)
        }, 4000)
      } catch (err: any) {
        setResetErrorMsg(err.message || 'An error occurred during password reset.')
      } finally {
        setIsResetting(false)
      }
    }
  }

  return (
    <div className="min-h-screen bg-transparent">
      <div className="grid min-h-screen lg:grid-cols-2">
        <div className="flex flex-col justify-center px-6 py-12 md:px-12 lg:px-16">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 flex items-center gap-2">
              <img
                src="/placego-logo.png"
                alt="PlaceGO!"
                className="h-9 w-9 rounded-lg object-contain"
              />
              <span className="text-lg font-bold">PlaceGO!</span>
            </div>

            {isForgotPassword ? (
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Reset Password</h1>
                <p className="mt-2 text-muted-foreground">
                  Verify your student identity to set a new password.
                </p>

                <form className="mt-8 space-y-5" onSubmit={(e) => e.preventDefault()}>
                  {resetErrorMsg && (
                    <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-semibold">
                      {resetErrorMsg}
                    </div>
                  )}

                  {resetSuccessMsg && (
                    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-600 font-semibold">
                      {resetSuccessMsg}
                    </div>
                  )}

                  {selectedRole === 'coordinator' ? (
                    <>
                      <div>
                        <label htmlFor="resetEmail" className="text-sm font-medium">
                          Registered Email Address
                        </label>
                        <input
                          id="resetEmail"
                          type="text"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          placeholder="e.g. coordinator-it@college.edu"
                          className="mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring text-foreground"
                        />
                      </div>

                      <div>
                        <label htmlFor="resetBranch" className="text-sm font-medium">
                          Department / Branch
                        </label>
                        <select
                          id="resetBranch"
                          value={resetBranch}
                          onChange={(e) => setResetBranch(e.target.value)}
                          className="mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring text-foreground"
                        >
                          {DEFAULT_BRANCH_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label htmlFor="resetRoll" className="text-sm font-medium">
                          Roll Number
                        </label>
                        <input
                          id="resetRoll"
                          type="text"
                          value={resetRoll}
                          onChange={(e) => setResetRoll(e.target.value)}
                          placeholder="e.g. 21JR1A0501"
                          className="mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring text-foreground"
                        />
                      </div>

                      {selectedRole === 'student' && forgotPasswordStep === 2 && (
                        <>
                          <div className="rounded-lg bg-muted p-4">
                            <label className="text-sm font-semibold text-primary mb-2 block">Security Question</label>
                            <p className="text-base text-foreground font-medium mb-3">{fetchedSecurityQuestion}</p>
                            
                            <label htmlFor="secAnswerForgot" className="text-sm font-medium">Your Answer</label>
                            <input
                              id="secAnswerForgot"
                              type="text"
                              value={securityAnswer}
                              onChange={(e) => setSecurityAnswer(e.target.value)}
                              placeholder="Answer here..."
                              className="mt-1 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring"
                            />
                          </div>

                          <div>
                            <label htmlFor="resetEmail" className="text-sm font-medium">Registered Email</label>
                            <input
                              id="resetEmail"
                              type="email"
                              value={resetEmail}
                              onChange={(e) => setResetEmail(e.target.value)}
                              placeholder="student@college.edu"
                              className="mt-1 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring"
                            />
                          </div>

                          <div>
                            <label htmlFor="resetDob" className="text-sm font-medium">Date of Birth</label>
                            <input
                              id="resetDob"
                              type="text"
                              value={resetDob}
                              onChange={(e) => setResetDob(e.target.value)}
                              placeholder="DD/MM/YYYY or MM/DD/YY"
                              className="mt-1 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring"
                            />
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {((selectedRole === 'student' && forgotPasswordStep === 2) || selectedRole === 'coordinator') && (
                    <div>
                      <label htmlFor="resetPassword" className="text-sm font-medium">
                        New Password
                      </label>
                    <input
                      id="resetPassword"
                      type="password"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      placeholder="••••••••"
                      className="mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  )}

                  <div className="flex flex-col gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isResetting}
                      onClick={handleResetPassword}
                      className="flex h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95 disabled:opacity-50"
                    >
                      {isResetting ? 'Processing...' : (selectedRole === 'student' && forgotPasswordStep === 1) ? 'Continue' : 'Reset Password'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedRole === 'student' && forgotPasswordStep === 2) {
                          setForgotPasswordStep(1)
                          setResetErrorMsg(null)
                        } else {
                          setIsForgotPassword(false)
                          setResetErrorMsg(null)
                          setResetSuccessMsg(null)
                        }
                      }}
                      className="flex h-11 w-full items-center justify-center rounded-lg border border-input text-sm font-semibold hover:bg-muted"
                    >
                      {(selectedRole === 'student' && forgotPasswordStep === 2) ? 'Back' : 'Back to Sign In'}
                    </button>
                  </div>
                </form>
              </div>
            ) : loginStep === 'setup-2fa' ? (
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Set up 2FA</h1>
                <p className="mt-2 text-muted-foreground">
                  Scan the QR code with Google Authenticator or Authy to secure your account.
                </p>
                <div className="mt-8 flex flex-col items-center space-y-6">
                  {qrCodeData && (
                    <div className="rounded-xl border bg-white p-4 shadow-sm">
                      <img src={qrCodeData} alt="QR Code" className="h-48 w-48" />
                    </div>
                  )}
                  <form className="w-full space-y-5" onSubmit={(e) => { e.preventDefault(); handleVerify2FA(true); }}>
                    {errorMsg && (
                      <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-semibold">
                        {errorMsg}
                      </div>
                    )}
                    <div>
                      <label htmlFor="otpCode" className="text-sm font-medium">Enter 6-digit Code</label>
                      <input
                        id="otpCode"
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-center text-xl tracking-widest outline-none focus:border-ring focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    
                    <div className="space-y-3 rounded-lg bg-muted p-4 border border-input">
                      <h3 className="text-sm font-semibold text-primary mb-1">Set a Security Question</h3>
                      <p className="text-xs text-muted-foreground leading-snug">This will be used to recover your account if you forget your password.</p>
                      
                      <div>
                        <select
                          value={securityQuestion}
                          onChange={(e) => setSecurityQuestion(e.target.value)}
                          className="mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring"
                        >
                          <option value="What is your favorite food?">What is your favorite food?</option>
                          <option value="In what city were you born?">In what city were you born?</option>
                          <option value="What is the name of your first pet?">What is the name of your first pet?</option>
                          <option value="Who is your favorite person?">Who is your favorite person?</option>
                        </select>
                      </div>
                      
                      <div>
                        <input
                          type="text"
                          value={securityAnswer}
                          onChange={(e) => setSecurityAnswer(e.target.value)}
                          placeholder="Your answer..."
                          className="mt-1 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-3 pt-2">
                      <button type="submit" className="flex h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95">
                        Verify and Enable 2FA
                      </button>
                      <button type="button" onClick={() => setLoginStep('password')} className="flex h-11 w-full items-center justify-center rounded-lg border border-input text-sm font-semibold hover:bg-muted">
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : loginStep === 'verify-2fa' ? (
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Two-Factor Authentication</h1>
                <p className="mt-2 text-muted-foreground">
                  Enter the 6-digit code from your authenticator app.
                </p>
                <form className="mt-8 space-y-5" onSubmit={(e) => { e.preventDefault(); handleVerify2FA(false); }}>
                  {errorMsg && (
                    <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-semibold">
                      {errorMsg}
                    </div>
                  )}
                  <div>
                    <label htmlFor="otpCodeVerify" className="text-sm font-medium">Verification Code</label>
                    <input
                      id="otpCodeVerify"
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="mt-1.5 h-14 w-full rounded-lg border border-input bg-background px-3 text-center text-2xl tracking-[0.5em] outline-none focus:border-ring focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="flex flex-col gap-3 pt-2">
                    <button type="submit" className="flex h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95">
                      Verify Code
                    </button>
                    <button type="button" onClick={() => setLoginStep('password')} className="flex h-11 w-full items-center justify-center rounded-lg border border-input text-sm font-semibold hover:bg-muted">
                      Back to Login
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
                <p className="mt-2 text-muted-foreground">
                  Sign in to your placement portal account.
                </p>

                <div className="mt-6">
                  <p className="mb-2 text-sm font-medium">Sign in as</p>
                  <div className="flex flex-wrap gap-2">
                    {roles.map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setSelectedRole(role)}
                        className={cn(
                          'rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize transition',
                          selectedRole === role
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-input hover:bg-muted',
                        )}
                      >
                        {role === 'coordinator' ? 'HOD/Coordinator' : role}
                      </button>
                    ))}
                  </div>
                </div>

                <form className="mt-8 space-y-5" onSubmit={(e) => e.preventDefault()}>
                  {errorMsg && (
                    <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-semibold">
                      {errorMsg}
                    </div>
                  )}

                  <div>
                    <label htmlFor="username" className="text-sm font-medium">
                      {selectedRole === 'student' ? 'Roll Number' : 'Username or email'}
                    </label>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={selectedRole === 'student' ? 'e.g. 21JR1A0501' : defaults.email}
                      className="mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label htmlFor="password" className="text-sm font-medium">
                        Password
                      </label>
                      {(selectedRole === 'student' || selectedRole === 'coordinator') && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsForgotPassword(true)
                            setErrorMsg(null)
                          }}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" defaultChecked className="rounded border-input" />
                    Remember me
                  </label>

                  <button
                    type="button"
                    onClick={handleSignIn}
                    className="flex h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95"
                  >
                    Sign in as {selectedRole === 'coordinator' ? 'HOD/Coordinator' : selectedRole}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        <div className="relative hidden overflow-hidden bg-primary lg:flex lg:flex-col lg:justify-center lg:px-16">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-blue-700 to-blue-900 opacity-90" />
          <div className="relative z-10 max-w-lg text-white">
            <img
              src="/placego-logo.png"
              alt="PlaceGO!"
              className="h-20 w-20 rounded-2xl object-contain bg-white/10 p-2 mb-8 shadow-lg shadow-black/20"
            />
            <h2 className="text-3xl font-bold leading-tight">Empowering campus placements</h2>
            <p className="mt-4 text-white/70">
              Unified platform for students and admins — built to scale across
              departments and batches.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
              {[
                { value: stats.students, label: 'Students' },
                { value: stats.placements, label: 'Placed' },
                { value: stats.companies, label: 'Companies' },
                { value: stats.drives, label: 'Drives' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="mt-1 text-sm text-white/70">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
