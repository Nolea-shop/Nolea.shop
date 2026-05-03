import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Download, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { motion } from 'motion/react';

export function Success() {
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();
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
          <button className="w-full bg-[#2D2A26] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all mb-4 text-xs uppercase tracking-widest">
            <Download size={20} strokeWidth={1.5} /> Jetzt Herunterladen (PDF)
          </button>
          <p className="text-[10px] text-[#6B6658] uppercase tracking-[0.2em] font-bold">
            Der Link ist 48 Stunden gültig.
          </p>
        </div>

        <Link to="/shop" className="text-[#8A9A5B] font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:gap-4 transition-all">
          Weiter Shoppen <ArrowRight size={18} />
        </Link>
      </motion.div>
    </div>
  );
}
