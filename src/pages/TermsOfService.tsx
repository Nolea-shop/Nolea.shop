import React from 'react';
import { Link } from 'react-router-dom';

export function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="text-[#8A9A5B] hover:underline text-sm mb-6 inline-block">
          ← Back to Home
        </Link>
        
        <h1 className="text-3xl font-serif font-bold text-[#1F1D1A] mb-8">Terms of Service</h1>
        
        <div className="prose prose-gray max-w-none space-y-6 text-[#5C5748]">
          <p><em>Last updated: May 2026</em></p>

          <h2 className="text-xl font-semibold text-[#1F1D1A] mt-8">1. Acceptance of Terms</h2>
          <p>
            By accessing and using nolea.shop (the "Website"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Website.
          </p>

          <h2 className="text-xl font-semibold text-[#1F1D1A] mt-8">2. Description of Service</h2>
          <p>
            Nolea Studio provides digital PDF guides and e-books for download. All products are delivered digitally — no physical goods are shipped.
          </p>

          <h2 className="text-xl font-semibold text-[#1F1D1A] mt-8">3. Account Registration</h2>
          <p>
            You may browse our shop without an account. To make a purchase, you can check out as a guest or create an account using Google Sign-In. You are responsible for maintaining the security of your account.
          </p>

          <h2 className="text-xl font-semibold text-[#1F1D1A] mt-8">4. Purchases and Payment</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>All prices are listed in EUR (€) and include applicable taxes</li>
            <li>Payments are processed securely through Stripe</li>
            <li>Upon successful payment, you will receive an email with download links</li>
            <li>Download links are valid for 7 days from the date of purchase</li>
          </ul>

          <h2 className="text-xl font-semibold text-[#1F1D1A] mt-8">5. Digital Products and Licensing</h2>
          <p>
            When you purchase a digital product from Nolea, you receive a personal, non-transferable license to download and use the content for your own personal or professional use. You may not:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Redistribute, resell, or share the digital content</li>
            <li>Use the content for commercial purposes beyond personal use</li>
            <li>Remove any copyright or branding notices from the content</li>
          </ul>

          <h2 className="text-xl font-semibold text-[#1F1D1A] mt-8">6. Refund Policy</h2>
          <p>
            As all products are digital downloads, we generally do not offer refunds once the download link has been accessed. If you experience issues with a product or have not received your download, please contact us at <a href="mailto:noleashop@gmail.com" className="text-[#8A9A5B] hover:underline">noleashop@gmail.com</a> and we will assist you.
          </p>

          <h2 className="text-xl font-semibold text-[#1F1D1A] mt-8">7. Intellectual Property</h2>
          <p>
            All content on this Website, including but not limited to text, graphics, logos, and digital products, is the property of Nolea Studio and is protected by copyright laws.
          </p>

          <h2 className="text-xl font-semibold text-[#1F1D1A] mt-8">8. Limitation of Liability</h2>
          <p>
            Nolea Studio shall not be liable for any indirect, incidental, or consequential damages arising from the use of our Website or digital products. Our total liability shall not exceed the amount you paid for the product.
          </p>

          <h2 className="text-xl font-semibold text-[#1F1D1A] mt-8">9. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms of Service at any time. Changes will be effective immediately upon posting to the Website. Your continued use of the Website after changes constitutes acceptance of the new terms.
          </p>

          <h2 className="text-xl font-semibold text-[#1F1D1A] mt-8">10. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with applicable laws. Any disputes shall be resolved in the jurisdiction of our business address.
          </p>

          <h2 className="text-xl font-semibold text-[#1F1D1A] mt-8">11. Contact</h2>
          <p>
            For questions about these Terms of Service, please contact us at <a href="mailto:noleashop@gmail.com" className="text-[#8A9A5B] hover:underline">noleashop@gmail.com</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
