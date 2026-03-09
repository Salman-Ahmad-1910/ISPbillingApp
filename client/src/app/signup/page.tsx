'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CircleDollarSign, Users, Zap, Globe, ArrowRight, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import * as React from 'react';
import api from '@/lib/api';

export default function SignupPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());

    try {
      const response = await api.post('/auth/signup', {
        name: data.name,
        companyName: data.company,
        email: data.email,
        password: data.password,
      });

      const { token } = response.data.data;
      if (token) {
        localStorage.setItem('token', token);
        router.push('/');
        router.refresh();
      } else {
        // Fallback if no token returned
        router.push('/login?registered=true');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="mb-4">
                <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Home
                </Link>
              </div>
          {/* <Link href="/" className="flex items-center gap-2 justify-center mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-900 to-black rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">Fintrack ERP</span>
          </Link> */}

          <Card className="w-full border-gray-200 shadow-lg h-full overflow-y-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-gray-900">Create Account</CardTitle>
              <CardDescription className="text-gray-600">
                Join thousands of ISPs managing their business with Fintrack ERP
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md mb-4 border border-red-200">
                  {error}
                </div>
              )}
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-700">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="John Doe"
                    required
                    className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company" className="text-gray-700">Company Name</Label>
                  <Input
                    id="company"
                    name="company"
                    type="text"
                    placeholder="Acme Inc."
                    required
                    className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
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
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Button>
                <p className="text-center text-sm text-gray-600">
                  Already have an account?{' '}
                  <Link href="/login" className="font-semibold text-gray-900 hover:underline">
                    Sign In
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
            <h1 className="text-3xl md:text-4xl font-bold mb-6 drop-shadow-lg">
              Transform Your ISP Business Today
            </h1>
            <p className="text-base text-gray-300 mb-10 leading-relaxed">
              Get started with the world's most comprehensive ISP management platform. 
              Join 500+ ISPs already using Fintrack ERP worldwide.
            </p>

            {/* Animated Benefits */}
            <div className="space-y-2 text-left">
              <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-12 duration-700">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Quick Setup</h3>
                  <p className="text-gray-400 text-sm">Get started in minutes, not days</p>
                </div>
              </div>

              <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-12 duration-700 delay-200">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Free Trial</h3>
                  <p className="text-gray-400 text-sm">14 days free, no credit card required</p>
                </div>
              </div>

              <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-12 duration-700 delay-400">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
                  <Globe className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Global Ready</h3>
                  <p className="text-gray-400 text-sm">Support for multiple currencies and languages</p>
                </div>
              </div>
            </div>

            {/* Features List */}
            <div className="mt-8 bg-white/5 backdrop-blur-sm rounded-lg p-6 animate-in fade-in slide-in-from-bottom-12 duration-700 delay-600">
              <h3 className="font-semibold text-white mb-4">What you'll get:</h3>
              <div className="space-y-3 text-left">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300 text-sm">Complete ISP management suite</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300 text-sm">Automated billing & invoicing</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300 text-sm">Customer relationship management</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300 text-sm">24/7 customer support</span>
                </div>
              </div>
            </div>

            {/* CTA */}
            {/* <div className="mt-8 animate-in fade-in slide-in-from-bottom-12 duration-700 delay-800">
              <div className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors">
                <span>Ready to get started?</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
}
