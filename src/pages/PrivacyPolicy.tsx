import React from 'react';
import { Link } from 'react-router-dom';

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="text-[#8A9A5B] hover:underline text-sm mb-6 inline-block">
          ← Back to Home
        </Link>
        
        <h1 className="text-3xl font-serif font-bold text-[#1F1D1A] mb-8">Privacy Policy</h1>
        
        <div className="prose prose-gray max-w-none space-y-6 text-[#5C5748]">
          <p><em>Last updated: May 2026</em></p>

          <h2 className="text-xl font-semibold text-[#1F1D1A] mt-8">1. Introduction</h2>
          <p>
            Welcome to Nolea Studio ("we," "our," or "us"). We operate nolea.shop and are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you visit our website and purchase our digital products.
          </p>

          <h2 className="text-xl font-semibold text-[#1F1D1A] mt-8">2. Information We Collect</h2>
          <p>We may collect the following information:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Name and email address (when you create an account or make a purchase)</li>
            <li>Payment information (processed securely through Stripe — we do not store card details)</li>
            <li>Download history and purchase records</li>
            <li>Usage data (pages visited, time spent on site)</li>
          </ul>

          <h2 className="text-xl font-semibold text-[#1F1D1A] mt-8">3. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Process your purchases and deliver digital products</li>
            <li>Send order confirmations and download links</li>
            <li>Provide customer support</li>
            <li>Improve our website and services</li>
          </ul>

          <h2 className="text-xl font-semibold text-[#1F1D1A] mt-8">4. Payment Processing</h2>
          <p>
            All payments are processed through Stripe. We do not store your credit card information on our servers. Stripe's privacy policy can be found at <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#8A9A5B] hover:underline">stripe.com/privacy</a>.
          </p>

          <h2 className="text-xl font-semibold text-[#1F1D1A] mt-8">5. Digital Products</h2>
          <p>
            All products sold on Nolea are digital downloads. Once purchased, download links are provided via email and are valid for 7 days. As digital products, they are non-refundable once downloaded.
          </p>

          <h2 className="text-xl font-semibold text-[#1F1D1A] mt-8">6. Data Security</h2>
          <p>
            We implement appropriate security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
          </p>

          <h2 className="text-xl font-semibold text-[#1F1D1A] mt-8">7. Third-Party Services</h2>
          <p>We use the following third-party services:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Stripe</strong> — Payment processing</li>
            <li><strong>Google</strong> — Authentication (optional sign-in)</li>
            <li><strong>Vercel</strong> — Website hosting</li>
          </ul>

          <h2 className="text-xl font-semibold text-[#1F1D1A] mt-8">8. Your Rights</h2>
          <p>
            You have the right to access, correct, or delete your personal data. To exercise these rights, please contact us at <a href="mailto:noleashop@gmail.com" className="text-[#8A9A5B] hover:underline">noleashop@gmail.com</a>.
          </p>

          <h2 className="text-xl font-semibold text-[#1F1D1A] mt-8">9. Cookies</h2>
          <p>
            We use essential cookies to maintain your session and cart. We do not use tracking cookies without your consent.
          </p>

          <h2 className="text-xl font-semibold text-[#1F1D1A] mt-8">10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page with an updated "Last updated" date.
          </p>

          <h2 className="text-xl font-semibold text-[#1F1D1A] mt-8">11. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at <a href="mailto:noleashop@gmail.com" className="text-[#8A9A5B] hover:underline">noleashop@gmail.com</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
