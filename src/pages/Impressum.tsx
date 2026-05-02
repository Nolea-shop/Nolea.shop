import React from 'react';

export function Impressum() {
  return (
    <div className="bg-[#FAF9F6] min-h-screen py-24">
      <div className="max-w-4xl mx-auto px-6 bg-white rounded-3xl p-12 shadow-sm border border-stone-100">
        <h1 className="text-4xl font-serif font-bold text-stone-800 mb-12 border-b border-stone-100 pb-8">
          Impressum
        </h1>

        <div className="space-y-12">
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#9a4024] mb-4">Angaben gemäß § 5 TMG</h2>
            <p className="text-stone-600 font-serif text-lg leading-relaxed">
              Herzstück Studio <br />
              Heimatstraße 12 <br />
              10115 Berlin <br />
              Deutschland
            </p>
          </section>

          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#9a4024] mb-4">Kontakt</h2>
            <p className="text-stone-600 font-serif text-lg leading-relaxed">
              Telefon: +49 (0) 123 456789 <br />
              E-Mail: hello@herzstueck-shop.de
            </p>
          </section>

          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#9a4024] mb-4">Umsatzsteuer-ID</h2>
            <p className="text-stone-600 font-serif text-lg leading-relaxed">
              Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz: <br />
              DE 123 456 789
            </p>
          </section>

          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#9a4024] mb-4">Redaktionell verantwortlich</h2>
            <p className="text-stone-600 font-serif text-lg leading-relaxed">
              Julian Legendstar
            </p>
          </section>

          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#9a4024] mb-4">Verbraucherstreitbeilegung/ Universalschlichtungsstelle</h2>
            <p className="text-stone-600 font-serif text-lg leading-relaxed">
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
