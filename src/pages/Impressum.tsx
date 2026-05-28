import React from 'react';

export function Impressum() {
  return (
    <div className="bg-[#FAF9F6] min-h-screen py-24">
      <div className="max-w-4xl mx-auto px-6 bg-white rounded-3xl p-12 shadow-sm border border-[#E5E2D9]">
        <h1 className="text-4xl font-serif font-bold text-[#1F1D1A] mb-12 border-b border-[#F2EFE9] pb-8">
          Legal Notice
        </h1>

        <div className="space-y-12">
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#7A8F4E] mb-4">
              Information according to § 5 TMG
            </h2>
            <p className="text-[#5C5748] font-serif text-lg leading-relaxed">
              Nolea Studio <br />
              Heimatstraße 12 <br />
              10115 Berlin <br />
              Germany
            </p>
          </section>

          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#7A8F4E] mb-4">Contact</h2>
            <p className="text-[#5C5748] font-serif text-lg leading-relaxed">
              Phone: +49 (0) 123 456789 <br />
              Email: hello@nolea-studio.de
            </p>
          </section>

          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#7A8F4E] mb-4">VAT ID</h2>
            <p className="text-[#5C5748] font-serif text-lg leading-relaxed">
              VAT identification number according to § 27 a VAT Act: <br />
              DE 123 456 789
            </p>
          </section>

          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#7A8F4E] mb-4">
              Person responsible for content
            </h2>
            <p className="text-[#5C5748] font-serif text-lg leading-relaxed">
              Julian Legendstar
            </p>
          </section>

          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#7A8F4E] mb-4">
              Consumer dispute resolution
            </h2>
            <p className="text-[#5C5748] font-serif text-lg leading-relaxed">
              We are not willing or obliged to participate in dispute resolution proceedings before a consumer arbitration board.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
