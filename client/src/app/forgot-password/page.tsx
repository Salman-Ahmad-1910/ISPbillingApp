'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, KeyRound, Lock, Eye, EyeOff, Users, ShieldCheck, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import * as React from 'react';
import api from '@/lib/api';
import { MessageDialog } from '@/components/shared/message-dialog';

type Step = 'email' | 'reset' | 'done';

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = React.useState<Step>('email');
  const [email, setEmail] = React.useState('');
  const [devOtp, setDevOtp] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const [errorDialog, setErrorDialog] = React.useState<{ open: boolean; title: string; message: string }>({ open: false, title: '', message: '' });
  const [successDialog, setSuccessDialog] = React.useState<{ open: boolean; title: string; message: string; confirmLabel: string; onConfirm?: () => void }>({ open: false, title: '', message: '', confirmLabel: 'OK' });

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const em = String(formData.get('email') ?? '').trim();

    try {
      const response = await api.post('/auth/forgot-password', { email: em });
      setEmail(em);
      setDevOtp(response.data.data?.devMode ? String(response.data.data.otp ?? '') : '');
      setSuccessDialog({
        open: true,
        title: 'OTP Sent',
        message: response.data.message || 'If this email is registered, a password reset OTP has been sent to your inbox.',
        confirmLabel: 'Continue',
        onConfirm: () => setStep('reset'),
      });
    } catch (err: any) {
      setErrorDialog({
        open: true,
        title: 'Request Failed',
        message: err?.response?.data?.message || 'Failed to send password reset email. Please try again.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const otp = String(formData.get('otp') ?? '').trim();
    const password = String(formData.get('password') ?? '');
    const confirm = String(formData.get('confirm') ?? '');

    if (!/^\d{6}$/.test(otp)) {
      setErrorDialog({ open: true, title: 'Invalid OTP', message: 'Please enter the 6-digit code sent to your email.' });
      setIsLoading(false);
      return;
    }
    if (password.length < 6) {
      setErrorDialog({ open: true, title: 'Weak Password', message: 'Password must be at least 6 characters long.' });
      setIsLoading(false);
      return;
    }
    if (password !== confirm) {
      setErrorDialog({ open: true, title: 'Passwords Do Not Match', message: 'Please make sure both password fields match.' });
      setIsLoading(false);
      return;
    }

    try {
      await api.post('/auth/reset-password', { email, otp, password });
      setStep('done');
      setSuccessDialog({
        open: true,
        title: 'Password Reset Successful',
        message: 'Your password has been reset. Please sign in with your new password.',
        confirmLabel: 'Go to Sign In',
        onConfirm: () => router.push('/login'),
      });
    } catch (err: any) {
      setErrorDialog({
        open: true,
        title: 'Reset Failed',
        message: err?.response?.data?.message || 'Failed to reset password. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="mb-4">
            <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Link>
          </div>

          <Card className="w-full border-gray-200 shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-gray-900 to-black shadow-md">
                {step === 'email' ? <Mail className="h-7 w-7 text-white" /> : <KeyRound className="h-7 w-7 text-white" />}
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                {step === 'email' ? 'Forgot Password' : 'Reset Password'}
              </CardTitle>
              <CardDescription className="text-gray-600">
                {step === 'email'
                  ? 'Enter your account email and we will send you a 6-digit OTP to reset your password.'
                  : `Enter the OTP sent to ${email} and choose a new password.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {step === 'email' && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter your registered email"
                      required
                      className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-gray-900 hover:bg-black text-white" disabled={isSending}>
                    {isSending ? 'Sending OTP...' : 'Send OTP'}
                  </Button>
                  <p className="text-center text-sm text-gray-600">
                    Remembered your password?{' '}
                    <Link href="/login" className="font-semibold text-gray-900 hover:underline">
                      Sign In
                    </Link>
                  </p>
                </form>
              )}

              {step === 'reset' && (
                <form onSubmit={handleReset} className="space-y-4">
                  {devOtp && (
                    <div className="bg-blue-50 text-blue-700 text-sm p-3 rounded-md mb-2 border border-blue-200">
                      Email delivery not configured (dev mode). Your OTP is: <span className="font-mono font-bold tracking-widest">{devOtp}</span>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="otp" className="text-gray-700">OTP Code</Label>
                    <Input
                      id="otp"
                      name="otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="Enter 6-digit OTP"
                      required
                      className="border-gray-300 focus:border-gray-900 focus:ring-gray-900 tracking-[0.3em] text-center font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-700">New Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter new password"
                        required
                        className="border-gray-300 focus:border-gray-900 focus:ring-gray-900 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm" className="text-gray-700">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm"
                        name="confirm"
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="Re-enter new password"
                        required
                        className="border-gray-300 focus:border-gray-900 focus:ring-gray-900 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-gray-900 hover:bg-black text-white" disabled={isLoading}>
                    {isLoading ? 'Resetting...' : 'Reset Password'}
                  </Button>
                  <p className="text-center text-sm text-gray-600">
                    Didn&apos;t receive the code?{' '}
                    <button
                      type="button"
                      className="font-semibold text-gray-900 hover:underline"
                      onClick={() => setStep('email')}
                    >
                      Resend OTP
                    </button>
                  </p>
                </form>
              )}

              {step === 'done' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4">
                    <Lock className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                    <p className="text-sm text-emerald-700">Your password has been updated. You can now sign in with your new password.</p>
                  </div>
                  <Button type="button" className="w-full bg-gray-900 hover:bg-black text-white" onClick={() => router.push('/login')}>
                    Go to Sign In
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Side - Animated Content */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-900 to-black relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full opacity-20 animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-gray-600 to-gray-700 rounded-full opacity-30 animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-gray-800 to-gray-900 rounded-full opacity-40 animate-spin-slow" />
        </div>

        <div className="relative z-20 flex flex-col justify-center items-center h-full p-12 text-white">
          <div className="max-w-lg text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 drop-shadow-lg">
              Recover Your Account Easily
            </h1>
            <p className="text-xl text-gray-300 mb-12 leading-relaxed">
              We&apos;ll send a secure OTP to your email so you can set a new password in minutes.
            </p>

            <div className="space-y-6">
              <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-12 duration-700">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <Lock className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-white">Secure Reset</h3>
                  <p className="text-gray-400 text-sm">Your account stays protected end-to-end</p>
                </div>
              </div>

              <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-12 duration-700 delay-200">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-white">Time-Limited OTP</h3>
                  <p className="text-gray-400 text-sm">Codes expire in 10 minutes for your safety</p>
                </div>
              </div>

              <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-12 duration-700 delay-400">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-white">Join 500+ ISPs</h3>
                  <p className="text-gray-400 text-sm">Trusting Fintrack ERP worldwide</p>
                </div>
              </div>
            </div>

            <div className="mt-12 animate-in fade-in slide-in-from-bottom-12 duration-700 delay-600">
              <div className="select-none inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors">
                <span>Back to</span>
                <Link href="/login" className="underline decoration-white/40 hover:decoration-white">Sign In</Link>
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <MessageDialog
        open={successDialog.open}
        onClose={() => setSuccessDialog((d) => ({ ...d, open: false }))}
        type="success"
        title={successDialog.title}
        message={successDialog.message}
        confirmLabel={successDialog.confirmLabel}
        onConfirm={successDialog.onConfirm}
      />
      <MessageDialog
        open={errorDialog.open}
        onClose={() => setErrorDialog({ open: false, title: '', message: '' })}
        type="error"
        title={errorDialog.title}
        message={errorDialog.message}
      />
    </div>
  );
}