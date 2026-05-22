import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Download, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export function Success() {
  const [downloadLinks, setDownloadLinks] = useState<Array<{ title: string; url: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // PDF Download-URL über Supabase Storage bauen
  const getPdfUrl = (filename: string): string => {
    const base = 'https://mmlqyzcowrckhtaaqzvz.supabase.co';
    const bucket = 'pdfs';
    return `${base}/storage/v1/object/public/${bucket}/${encodeURIComponent(filename)}`;
  };

  useEffect(() => {
    // Session-ID aus URL lesen
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');

    if (!sessionId) {
      setError('Keine Session-ID gefunden.');
      setLoading(false);
      return;
    }

    // Poll download-links API (alle 3s, max 30s)
    let attempts = 0;
    const maxAttempts = 10;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/download-links?session_id=${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.downloadLinks && data.downloadLinks.length > 0) {
            // Nutze die von der API bereits gelieferten signierten URLs direkt
            const links = data.downloadLinks.map((l: any) => ({
              title: l.title,
              url: l.url,
            }));
            setDownloadLinks(links);
            setLoading(false);
            clearInterval(interval);
          }
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
      if (attempts >= maxAttempts) {
        setError('Download-Links konnten nicht geladen werden. Bitte kontaktiere den Support.');
        setLoading(false);
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#FAF9F6] min-h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl w-full bg-white rounded-[2.5rem] p-12 text-center shadow-xl border border-[#E5E2D9]"
      >
        <div className="w-20 h-20 bg-[#F2EFE9] text-[#8A9A5B] rounded-full flex items-center justify-center mx-auto mb-8">
          <CheckCircle size={48} strokeWidth={1.5} />
        </div>

        <h1 className="text-4xl font-serif italic text-[#2D2A26] mb-4">Vielen Dank für deinen Kauf!</h1>
        <p className="text-[#6B6658] mb-10 leading-relaxed font-serif italic text-lg">
          Deine digitalen Produkte sind bereit. Wir haben dir eine Bestätigung per E-Mail geschickt.
        </p>

        <div className="bg-[#F2EFE9] rounded-2xl p-6 mb-10 border border-[#E5E2D9]">
          {loading && (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader2 className="animate-spin text-[#8A9A5B]" size={24} />
              <p className="text-xs text-[#6B6658] uppercase tracking-[0.2em] font-bold">
                Lade Download-Links…
              </p>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 uppercase tracking-[0.2em] font-bold">
              {error}
            </p>
          )}

          {!loading && !error && downloadLinks.length > 0 && (
            <div className="flex flex-col gap-3">
              {downloadLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#2D2A26] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all text-xs uppercase tracking-widest"
                >
                  <Download size={20} strokeWidth={1.5} />
                  {link.title} herunterladen (PDF)
                </a>
              ))}
              <p className="text-[10px] text-[#6B6658] uppercase tracking-[0.2em] font-bold text-center mt-1">
                Der Link ist 24 Stunden gültig.
              </p>
            </div>
          )}
        </div>

        <Link to="/shop" className="text-[#8A9A5B] font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:gap-4 transition-all">
          Weiter Shoppen <ArrowRight size={18} />
        </Link>
      </motion.div>
    </div>
  );
}
