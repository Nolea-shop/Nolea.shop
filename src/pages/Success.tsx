     1|import React, { useEffect, useState } from 'react';
     2|import { Link } from 'react-router-dom';
     3|import { CheckCircle, Download, ArrowRight, Loader2 } from 'lucide-react';
     4|import { motion } from 'motion/react';
     5|
     6|export function Success() {
     7|  const [downloadLinks, setDownloadLinks] = useState<Array<{ title: string; url: string }>>([]);
     8|  const [loading, setLoading] = useState(true);
     9|  const [error, setError] = useState('');
    10|
    11|  useEffect(() => {
    12|    const params = new URLSearchParams(window.location.search);
    13|    const sessionId = params.get('session_id');
    14|
    15|    if (!sessionId) {
    16|      setError('No session ID found.');
    17|      setLoading(false);
    18|      return;
    19|    }
    20|
    21|    let attempts = 0;
    22|    const maxAttempts = 10;
    23|    const interval = setInterval(async () => {
    24|      attempts++;
    25|      try {
    26|        const res = await fetch(`/api/download-links?session_id=${sessionId}`);
    27|        if (res.ok) {
    28|          const data = await res.json();
    29|          if (data.downloadLinks && data.downloadLinks.length > 0) {
    30|            const links = data.downloadLinks.map((l: any) => ({
    31|              title: l.title,
    32|              url: l.url,
    33|            }));
    34|            setDownloadLinks(links);
    35|            setLoading(false);
    36|            clearInterval(interval);
    37|
    38|            // Pinterest: Track Checkout conversion
    39|            if (typeof window !== 'undefined' && (window as any).pintrk) {
    40|              const totalValue = links.reduce((sum: number) => sum + 4.99, 0);
    41|              (window as any).pintrk('track', 'checkout', {
    42|                event_id: sessionId,
    43|                value: totalValue,
    44|                order_quantity: links.length,
    45|                currency: 'EUR',
    46|                order_id: sessionId,
    47|                line_items: links.map((l: any) => ({
    48|                  product_name: l.title,
    49|                  product_id: l.title.toLowerCase().replace(/\s+/g, '-'),
    50|                  product_category: 'Digital Guide',
    51|                  product_price: 4.99,
    52|                  product_quantity: 1,
    53|                  product_brand: 'Nolea',
    54|                })),
    55|              });
    56|            }
    57|          }
    58|        }
    59|      } catch (e) {
    60|        console.error('Polling error:', e);
    61|      }
    62|      if (attempts >= maxAttempts) {
    63|        setError('Download links could not be loaded. Please contact support.');
    64|        setLoading(false);
    65|        clearInterval(interval);
    66|      }
    67|    }, 3000);
    68|
    69|    return () => clearInterval(interval);
    70|  }, []);
    71|
    72|  return (
    73|    <div className="bg-[#FAF9F6] min-h-screen flex items-center justify-center p-6">
    74|      <motion.div
    75|        initial={{ opacity: 0, scale: 0.9 }}
    76|        animate={{ opacity: 1, scale: 1 }}
    77|        className="max-w-xl w-full bg-white rounded-[2.5rem] p-12 text-center shadow-xl border border-[#E5E2D9]"
    78|      >
    79|        <div className="w-20 h-20 bg-[#F2EFE9] text-[#7A8F4E] rounded-full flex items-center justify-center mx-auto mb-8">
    80|          <CheckCircle size={48} strokeWidth={1.5} />
    81|        </div>
    82|
    83|        <h1 className="text-4xl font-serif italic text-[#1F1D1A] mb-4">Thank you for your purchase!</h1>
    84|        <p className="text-[#5C5748] mb-10 leading-relaxed font-serif italic text-lg">
    85|          Your digital products are ready. We have sent you a confirmation email.
    86|        </p>
    87|
    88|        <div className="bg-[#F2EFE9] rounded-2xl p-6 mb-10 border border-[#E5E2D9]">
    89|          {loading && (
    90|            <div className="flex flex-col items-center gap-2 py-2">
    91|              <Loader2 className="animate-spin text-[#7A8F4E]" size={24} />
    92|              <p className="text-xs text-[#5C5748] uppercase tracking-[0.2em] font-bold">
    93|                Loading download links...
    94|              </p>
    95|            </div>
    96|          )}
    97|
    98|          {error && (
    99|            <p className="text-xs text-red-600 uppercase tracking-[0.2em] font-bold">
   100|              {error}
   101|            </p>
   102|          )}
   103|
   104|          {!loading && !error && downloadLinks.length > 0 && (
   105|            <div className="flex flex-col gap-3">
   106|              {downloadLinks.map((link, idx) => (
   107|                <a
   108|                  key={idx}
   109|                  href={link.url}
   110|                  download
   111|                  target="_blank"
   112|                  rel="noopener noreferrer"
   113|                  className="w-full bg-[#1F1D1A] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all text-xs uppercase tracking-widest"
   114|                >
   115|                  <Download size={20} strokeWidth={1.5} />
   116|                  Download {link.title} (PDF)
   117|                </a>
   118|              ))}
   119|              <p className="text-[10px] text-[#5C5748] uppercase tracking-[0.2em] font-bold text-center mt-1">
   120|                Link valid for 24 hours.
   121|              </p>
   122|            </div>
   123|          )}
   124|        </div>
   125|
   126|        <Link to="/shop" className="text-[#7A8F4E] font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:gap-4 transition-all">
   127|          Continue Shopping <ArrowRight size={18} />
   128|        </Link>
   129|      </motion.div>
   130|    </div>
   131|  );
   132|}
   133|