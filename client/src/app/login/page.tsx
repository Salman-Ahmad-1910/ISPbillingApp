'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CircleDollarSign, Users, ShieldCheck, TrendingUp, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import * as React from 'react';
import api from '@/lib/api';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRegistered = searchParams.get('registered') === 'true';

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const email = formData.get('email');
    const password = formData.get('password');

    try {
      const response = await api.post('/auth/login', { email, password });
      const { token } = response.data.data;

      // Save token to localStorage (matching useUser hook)
      localStorage.setItem('token', token);

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          


          {/* <Link href="/" className="flex items-center gap-2 justify-center mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-900 to-black rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">Fintrack ERP</span>
          </Link> */}
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
              {/* <Link href="/" className="flex items-center gap-2 justify-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-900 to-black rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">F</span>
                </div>
                <span className="text-2xl font-bold text-gray-900">Fintrack ERP</span>
              </Link> */}
              <CardTitle className="text-2xl font-bold text-gray-900">Welcome Back</CardTitle>
              <CardDescription className="text-gray-600">
                Sign in to access your ISP management dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isRegistered && (
                <div className="bg-green-50 text-green-700 text-sm p-3 rounded-md mb-4 border border-green-200">
                  Registration successful! Please sign in with your credentials.
                </div>
              )}
              {error && (
                <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md mb-4 border border-red-200">
                  {error}
                </div>
              )}
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    required
                    className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-gray-700">Password</Label>
                    <Link href="#" className="text-xs text-gray-600 hover:text-gray-900">Forgot password?</Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
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
                <Button type="submit" className="w-full bg-gray-900 hover:bg-black text-white" disabled={isLoading}>
                  {isLoading ? "Signing In..." : "Sign In"}
                </Button>
                <p className="text-center text-sm text-gray-600">
                  Don&apos;t have an account?{' '}
                  <Link href="/signup" className="font-semibold text-gray-900 hover:underline">
                    Sign up
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Side - Animated Content */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-900 to-black relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full opacity-20 animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-gray-600 to-gray-700 rounded-full opacity-30 animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-gray-800 to-gray-900 rounded-full opacity-40 animate-spin-slow" />
        </div>

        {/* Content */}
        <div className="relative z-20 flex flex-col justify-center items-center h-full p-12 text-white">
          <div className="max-w-lg text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 drop-shadow-lg">
              Manage Your ISP Business Like Never Before
            </h1>
            <p className="text-xl text-gray-300 mb-12 leading-relaxed">
              Join thousands of ISPs worldwide who trust Fintrack ERP for comprehensive business management, billing, and customer support.
            </p>

            {/* Animated Features */}
            <div className="space-y-6">
              <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-12 duration-700">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-white">500+ ISPs</h3>
                  <p className="text-gray-400 text-sm">Trust our platform worldwide</p>
                </div>
              </div>

              <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-12 duration-700 delay-200">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-white">99.9% Uptime</h3>
                  <p className="text-gray-400 text-sm">Reliable service guarantee</p>
                </div>
              </div>

              <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-12 duration-700 delay-400">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-white">50K+ Users</h3>
                  <p className="text-gray-400 text-sm">Active subscribers managed</p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-12 animate-in fade-in slide-in-from-bottom-12 duration-700 delay-600">
              <div className="select-none inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors">
                <span>Start your journey</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
