import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Download, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export function Success() {
  const [downloadLinks, setDownloadLinks] = useState<Array<{ title: string; url: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');

    if (!sessionId) {
      setError('No session ID found.');
      setLoading(false);
      return;
    }

    let attempts = 0;
    const maxAttempts = 10;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/download-links?session_id=${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.downloadLinks && data.downloadLinks.length > 0) {
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
        setError('Download links could not be loaded. Please contact support.');
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
        <div className="w-20 h-20 bg-[#F2EFE9] text-[#7A8F4E] rounded-full flex items-center justify-center mx-auto mb-8">
          <CheckCircle size={48} strokeWidth={1.5} />
        </div>

        <h1 className="text-4xl font-serif italic text-[#1F1D1A] mb-4">Thank you for your purchase!</h1>
        <p className="text-[#5C5748] mb-10 leading-relaxed font-serif italic text-lg">
          Your digital products are ready. We have sent you a confirmation email.
        </p>

        <div className="bg-[#F2EFE9] rounded-2xl p-6 mb-10 border border-[#E5E2D9]">
          {loading && (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader2 className="animate-spin text-[#7A8F4E]" size={24} />
              <p className="text-xs text-[#5C5748] uppercase tracking-[0.2em] font-bold">
                Loading download links...
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
                  className="w-full bg-[#1F1D1A] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all text-xs uppercase tracking-widest"
                >
                  <Download size={20} strokeWidth={1.5} />
                  Download {link.title} (PDF)
                </a>
              ))}
              <p className="text-[10px] text-[#5C5748] uppercase tracking-[0.2em] font-bold text-center mt-1">
                Link valid for 24 hours.
              </p>
            </div>
          )}
        </div>

        <Link to="/shop" className="text-[#7A8F4E] font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:gap-4 transition-all">
          Continue Shopping <ArrowRight size={18} />
        </Link>
      </motion.div>
    </div>
  );
}
