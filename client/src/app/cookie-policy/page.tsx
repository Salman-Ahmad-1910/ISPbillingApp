'use client';

import Link from 'next/link';

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <Link href="/" className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-gray-900 to-black rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Fintrack ERP</span>
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Cookie Policy</h1>
          <p className="text-xl text-gray-600">How we use cookies and tracking technologies</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="prose prose prose-gray-600 max-w-none">
          <h2>What Are Cookies?</h2>
          <p>
            Cookies are small text files that are stored on your device when you visit websites. 
            They help us provide you with a better experience by remembering your preferences and 
            enabling certain functionality.
          </p>

          <h2>How We Use Cookies</h2>
          <p>Fintrack ERP uses cookies for the following purposes:</p>
          <ul>
            <li>Essential functionality and security</li>
            <li>User authentication and session management</li>
            <li>Remembering your preferences and settings</li>
            <li>Analytics and performance monitoring</li>
            <li>Personalization and user experience improvements</li>
          </ul>

          <h2>Types of Cookies We Use</h2>
          <h3>Essential Cookies</h3>
          <p>These cookies are necessary for the website to function properly:</p>
          <ul>
            <li>Authentication tokens and session cookies</li>
            <li>Security and fraud prevention cookies</li>
            <li>Load balancing and server assignment cookies</li>
          </ul>

          <h3>Performance Cookies</h3>
          <p>These cookies help us understand how our website is being used:</p>
          <ul>
            <li>Analytics and usage statistics</li>
            <li>Error monitoring and performance tracking</li>
            <li>A/B testing and optimization</li>
          </ul>

          <h3>Functional Cookies</h3>
          <p>These cookies enhance your experience by remembering your preferences:</p>
          <ul>
            <li>Language and region preferences</li>
            <li>Theme and display settings</li>
            <li>Remembering your login status</li>
          </ul>

          <h2>Third-Party Cookies</h2>
          <p>We may use third-party services that place cookies on your device:</p>
          <ul>
            <li>Payment processors for secure transactions</li>
            <li>Analytics services for usage insights</li>
            <li>Customer support tools for chat functionality</li>
            <li>Social media integration services</li>
          </ul>

          <h2>Managing Your Cookie Preferences</h2>
          <p>You have several options for managing cookies:</p>
          <ul>
            <li>Browser settings to block or delete cookies</li>
            <li>Our cookie consent banner for granular control</li>
            <li>Opt-out links for specific third-party services</li>
            <li>Privacy settings within your account preferences</li>
          </ul>

          <h2>Cookie Duration</h2>
          <p>Different cookies have different lifespans:</p>
          <ul>
            <li>Session cookies expire when you close your browser</li>
            <li>Persistent cookies remain for the specified duration</li>
            <li>Authentication tokens typically expire after 30 days</li>
            <li>Analytics cookies may remain for up to 2 years</li>
          </ul>

          <h2>Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Know what cookies are being used</li>
            <li>Accept or reject non-essential cookies</li>
            <li>Delete cookies from your device</li>
            <li>Withdraw consent at any time</li>
            <li>Request information about cookie usage</li>
          </ul>

          <h2>Updates to This Policy</h2>
          <p>
            We may update this cookie policy from time to time to reflect changes in our 
            practices or for legal reasons. We will notify you of any significant changes.
          </p>

          <h2>Contact Us</h2>
          <p>If you have questions about our use of cookies, please contact us at:</p>
          <ul>
            <li>Email: privacy@fintrackerp.com</li>
            <li>Address: 123 Tech Street, Silicon Valley, CA 94025</li>
            <li>Phone: +1 (555) 123-4567</li>
          </ul>

          <p className="text-sm text-gray-500 mt-8">
            Last updated: March 7, 2026
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-gray-50 mt-16">
        <div className="container mx-auto py-8 px-4 text-center text-sm text-gray-600">
          <p>© 2026 Fintrack ERP. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
