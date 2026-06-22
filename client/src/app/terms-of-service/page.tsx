'use client';

import Link from 'next/link';

export default function TermsOfServicePage() {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-xl text-gray-600">Rules and guidelines for using Fintrack ERP</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="prose prose prose-gray-600 max-w-none">
          <h2>Acceptance of Terms</h2>
          <p>
            By accessing and using Fintrack ERP ("Service"), you agree to be bound by these Terms of Service ("Terms"). 
            If you do not agree to these Terms, you may not access or use our Service.
          </p>
          <p>
            These Terms govern your use of Fintrack ERP and constitute a legally binding agreement between you and Fintrack ERP.
          </p>

          <h2>Description of Service</h2>
          <p>
            Fintrack ERP is a comprehensive ISP management platform that provides tools for customer management, 
            billing, inventory, support, and administration for Internet Service Providers.
          </p>

          <h2>User Accounts</h2>
          <p>
            You must be at least 13 years old to create an account. You are responsible for maintaining the confidentiality of your 
            account credentials and for all activities under your account.
          </p>
          <p>
            You are responsible for all activity that occurs under your account, whether authorized by you or not.
          </p>

          <h2>Acceptable Use</h2>
          <p>You may use Fintrack ERP for legitimate ISP management purposes only. You agree not to:</p>
          <ul>
            <li>Use the Service for any illegal or unauthorized purpose</li>
            <li>Violate any laws or regulations</li>
            <li>Infringe on intellectual property rights</li>
            <li>Interfere with or disrupt the Service</li>
            <li>Attempt to gain unauthorized access</li>
            <li>Use the Service to send spam or malicious content</li>
          </ul>

          <h2>Payment and Subscription</h2>
          <p>You agree to provide accurate, complete billing information. We accept various payment methods as specified in our pricing page.</p>
          <p>
            All fees are non-refundable unless otherwise specified in our refund policy.
          </p>
          <p>
            We may change our pricing from time to time with 30 days notice.
          </p>

          <h2>Intellectual Property</h2>
          <p>All content and materials available on Fintrack ERP are owned by Fintrack ERP or its licensors and are protected by 
          copyright, trademark, and other intellectual property laws.</p>
          <p>You may not use our content without proper authorization.</p>

          <h2>Privacy and Data Protection</h2>
          <p>Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your information.</p>
          <p>You agree to our data processing practices as described in our Privacy Policy.</p>

          <h2>Service Availability</h2>
          <p>We strive to maintain high availability but do not guarantee uninterrupted service. 
          We may experience downtime for maintenance, updates, or other reasons.</p>
          <p>We are not liable for any losses resulting from service unavailability.</p>

          <h2>Limitation of Liability</h2>
          <p>To the fullest extent permitted by law, Fintrack ERP shall not be liable for any indirect, incidental, 
          special, consequential, or punitive damages arising from your use of the Service.</p>
          <p>Our total liability is limited to the amount you paid for the Service in the preceding month.</p>

          <h2>Indemnification</h2>
          <p>Fintrack ERP is provided "as is" without warranties of any kind, either express or implied.</p>
          <p>We do not guarantee the Service will meet your specific requirements or be error-free.</p>

          <h2>Termination</h2>
          <p>You may terminate your account at any time by contacting support.</p>
          <p>Upon termination, your access will continue until the end of your billing period.</p>
          <p>We may also suspend or terminate your account for violations of these Terms.</p>

          <h2>Changes to Terms</h2>
          <p>We reserve the right to modify these Terms at any time with notice to users.</p>
          <p>Continued use after changes constitutes acceptance of the modified Terms.</p>

          <h2>Governing Law</h2>
          <p>These Terms are governed by and construed in accordance with the laws of the jurisdiction where you access the Service.</p>
          <p>If any provision is found invalid, the remaining provisions remain enforceable.</p>

          <h2>Contact Information</h2>
          <p>For questions about these Terms, contact us at:</p>
          <ul>
            <li>Email: legal@fintrackerp.com</li>
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
