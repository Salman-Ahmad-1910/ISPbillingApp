'use client';

import Link from 'next/link';

export default function PrivacyPolicyPage() {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-xl text-gray-600">Your privacy is important to us</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="prose prose prose-gray-600 max-w-none">
          <h2>Introduction</h2>
          <p>
            At Fintrack ERP, we are committed to protecting your privacy and ensuring the security of your personal information. 
            This Privacy Policy explains how we collect, use, and protect your information when you use our ISP 
            management platform.
          </p>
          <p>
            This policy applies to all users of Fintrack ERP, regardless of how you access our service 
            (website, mobile app, or API). By using Fintrack ERP, you agree to the collection and use of information 
            described in this policy.
          </p>

          <h2>Information We Collect</h2>
          <h3>Information You Provide</h3>
          <p>We collect information you provide directly to us, including:</p>
          <ul>
            <li>Name, email address, and contact information</li>
            <li>Company information and business details</li>
            <li>Payment and billing information</li>
            <li>User account credentials and authentication data</li>
            <li>Customer data and subscriber information</li>
            <li>Support requests and communications</li>
          </ul>

          <h3>Automatically Collected Information</h3>
          <p>We automatically collect certain information when you use our service:</p>
          <ul>
            <li>Device information and browser data</li>
            <li>IP address and location data</li>
            <li>Usage patterns and interaction data</li>
            <li>System logs and error reports</li>
            <li>Performance and analytics data</li>
          </ul>

          <h2>How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul>
            <li>Provide and maintain our ISP management services</li>
            <li>Process payments and manage subscriptions</li>
            <li>Provide customer support and assistance</li>
            <li>Improve our products and services</li>
            <li>Communicate with you about our services</li>
            <li>Analyze usage patterns to optimize performance</li>
            <li>Ensure security and prevent fraud</li>
          </ul>

          <h2>Data Security</h2>
          <p>We implement industry-standard security measures to protect your information:</p>
          <ul>
            <li>SSL/TLS encryption for all data transmissions</li>
            <li>AES-256 encryption for stored data</li>
            <li>Regular security audits and penetration testing</li>
            <li>Role-based access control</li>
            <li>Secure data centers with 24/7 monitoring</li>
            <li>Regular data backups and disaster recovery</li>
          </ul>

          <h2>Data Sharing</h2>
          <p>We do not sell, rent, or trade your personal information. We may share your information only in the following circumstances:</p>
          <ul>
            <li>With your explicit consent</li>
            <li>With service providers necessary for our operations</li>
            <li>To comply with legal obligations</li>
            <li>To protect our rights, property, or safety</li>
            <li>In connection with business transfers or mergers</li>
          </ul>

          <h2>Your Rights</h2>
          <p>You have the following rights regarding your personal information:</p>
          <ul>
            <li>Access to your personal information</li>
            <li>Correction of inaccurate information</li>
            <li>Deletion of your personal information</li>
            <li>Portability of your data</li>
            <li>Restriction of processing</li>
            <li>Opt-out of marketing communications</li>
          </ul>

          <h2>Cookies and Tracking</h2>
          <p>We use cookies and similar tracking technologies to:</p>
          <ul>
            <li>Maintain user sessions and preferences</li>
            <li>Analyze website usage and performance</li>
            <li>Provide personalized experiences</li>
            <li>Remember your login status</li>
          </ul>

          <h2>International Data Transfers</h2>
          <p>Fintrack ERP is hosted globally and may transfer your information to countries other than your own. 
          We ensure appropriate safeguards are in place for international data transfers in accordance with 
          applicable laws.</p>

          <h2>Data Retention</h2>
          <p>We retain your personal information only as long as necessary to provide our services, 
          comply with legal obligations, or as otherwise permitted by law.</p>

          <h2>Children's Privacy</h2>
          <p>Our services are not intended for children under 13. We do not knowingly collect 
          personal information from children under 13.</p>

          <h2>Changes to This Policy</h2>
          <p>We may update this privacy policy from time to time. We will notify you of any material 
          changes by posting the updated policy on our website and updating the "Last Updated" date.</p>

          <h2>Contact Us</h2>
          <p>If you have questions about this Privacy Policy, please contact us at:</p>
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
