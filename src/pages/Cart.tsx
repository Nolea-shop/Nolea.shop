import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { Trash2, ArrowLeft, ArrowRight, CreditCard, ShoppingBag, ShieldCheck, Lock, RefreshCw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getStripe } from '../lib/stripe';
import toast from 'react-hot-toast';
import { motion } from 'motion/react';

export function Cart() {
  const { cart, removeFromCart, totalPrice } = useCart();
  const [user] = useAuthState(auth);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const navigate = useNavigate();

  const handleCheckout = async () => {
    if (!user) {
      toast.error('Bitte melde dich an, um fortzufahren.', {
        icon: '👋',
        style: {
          background: '#FAF9F6',
          color: '#2D2A26',
          border: '1px solid #E5E2D9',
          borderRadius: '1rem',
          padding: '12px 20px',
        },
      });
      return;
    }

    setIsCheckingOut(true);
    try {
      // Debug-Logging
      console.log('[Checkout] Starte Checkout für User:', user.uid, user.email);
      console.log('[Checkout] Warenkorb Artikel:', cart.length);
      console.log('[Checkout] Sende Daten:', { items: cart, userId: user.uid, userEmail: user.email });

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          userId: user.uid,
          userEmail: user.email,
        }),
      });

      console.log('[Checkout] Server-Antwort Status:', response.status, response.statusText);
      
      // Prüfe ob Antwort ok ist
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Server-Fehler: ${response.status} ${response.statusText} - ${errorData.error || 'Unbekannter Fehler'}`);
      }
      
      const { url } = await response.json();
      console.log('[Checkout] Server-Antwort Daten:', { url });
      
      if (url) {
        window.location.href = url;
      }
      console.log("[Checkout] Weiterleitung zu Stripe erfolgreich");
    } catch (error: any) {
      console.error('[Checkout] Fehler:', error);
      toast.error(`Checkout fehlgeschlagen: ${error.message || 'Unbekannter Fehler'}`, {
        duration: 5000,
        style: {
          background: '#FEF2F2',
          color: '#DC2626',
          border: '1px solid #FECACA',
        },
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (cart.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#FAF9F6] min-h-screen flex flex-col items-center justify-center p-6 text-center"
      >
        <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-[#F2EFE9] to-[#E5E2D9] flex items-center justify-center rounded-full mb-8 text-[#8A9A5B]">
          <ShoppingBag size={48} md:w-16 md:h-16 strokeWidth={1.5} />
        </div>
        <h2 className="text-2xl md:text-3xl font-serif italic text-[#2D2A26] mb-4">
          Dein Warenkorb ist leer
        </h2>
        <p className="text-[#6B6658] mb-6 md:mb-8 max-w-sm text-sm md:text-base leading-relaxed">
          Es scheint, als hättest du noch keine Guides hinzugefügt. Entdecke unsere handverlesenen digitalen Produkte!
        </p>
        <Link 
          to="/shop" 
          className="btn-press bg-[#8A9A5B] text-white px-8 md:px-10 py-3 md:py-4 rounded-full text-xs md:text-sm font-bold uppercase tracking-wider hover:bg-[#6B7A46] transition-all shadow-md hover:shadow-lg flex items-center gap-2"
        >
          Zum Shop <ArrowRight size={18} />
        </Link>
        
        {/* Trust Badges for Empty State */}
        <div className="flex flex-wrap justify-center gap-4 mt-12 md:mt-16 px-4">
          {[
            { icon: Lock, text: "Sicherer Checkout" },
            { icon: ShieldCheck, text: "Käuferschutz" },
            { icon: RefreshCw, text: "30 Tage Rückgabe" },
          ].map((badge, index) => (
            <div key={index} className="flex items-center gap-2 text-xs text-[#6B6658] bg-white px-4 py-2 rounded-full border border-[#E5E2D9]">
              <badge.icon size={14} className="text-[#8A9A5B]" />
              <span>{badge.text}</span>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-[#FAF9F6] min-h-screen py-10 md:py-16"
    >
      <div className="max-w-4xl mx-auto px-4 md:px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 md:mb-12">
          <Link to="/shop" className="text-[#6B6658] hover:text-[#8A9A5B] flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors">
            <ArrowLeft size={16} /> Zurück zum Shop
          </Link>
          <h1 className="text-2xl md:text-3xl font-serif italic text-[#2D2A26]">Warenkorb</h1>
        </div>

        {/* Cart Content */}
        <div className="bg-white rounded-2xl md:rounded-[2rem] border border-[#E5E2D9] shadow-sm overflow-hidden">
          {/* Cart Items */}
          <div className="divide-y divide-[#F2EFE9]">
            {cart.map((item, index) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 md:p-6 lg:p-8 flex gap-4 md:gap-6 items-center"
              >
                <img 
                  src={item.imageUrl} 
                  alt={item.title} 
                  className="w-16 h-16 md:w-20 md:h-20 rounded-xl object-cover border border-[#E5E2D9] flex-shrink-0" 
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif italic text-base md:text-lg text-[#2D2A26] mb-1 truncate">{item.title}</h3>
                  <p className="text-[10px] md:text-xs text-[#6B6658] font-bold uppercase tracking-widest">{item.category}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-base md:text-lg text-[#2D2A26] mb-2">{(item.price / 100).toFixed(2)}€</p>
                  <button 
                    onClick={() => {
                      removeFromCart(item.id);
                      toast.success(`${item.title} wurde entfernt`, {
                        icon: '🗑️',
                        duration: 2000,
                      });
                    }}
                    className="text-[#C5C2B9] hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 size={18} strokeWidth={1.5} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
          
          {/* Order Summary */}
          <div className="w-full md:w-80 lg:w-96 bg-gradient-to-br from-[#F2EFE9] to-[#FAF9F6] p-6 md:p-8 flex flex-col">
            <h4 className="text-[10px] uppercase tracking-widest text-[#6B6658] text-center mb-6 font-bold">Bestellübersicht</h4>
            
            <div className="space-y-3 md:space-y-4 mb-6">
              <div className="flex justify-between text-xs md:text-sm text-[#6B6658]">
                <span>Zwischensumme ({cart.length} {cart.length === 1 ? 'Artikel' : 'Artikel'})</span>
                <span>{(totalPrice / 100).toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-xs md:text-sm text-[#6B6658]">
                <span>MwSt. (7%)</span>
                <span>{((totalPrice * 0.07) / 100).toFixed(2)}€</span>
              </div>
              <div className="border-t border-[#E5E2D9] pt-4 flex justify-between items-center text-[#2D2A26]">
                <span className="font-serif italic text-lg md:text-xl text-[#2D2A26]">Gesamt</span>
                <span className="text-xl md:text-2xl font-bold">{(totalPrice / 100).toFixed(2)}€</span>
              </div>
            </div>

            <button 
              onClick={handleCheckout}
              disabled={isCheckingOut}
              className={`w-full py-4 md:py-5 rounded-xl font-bold text-sm md:text-base flex items-center justify-center gap-3 transition-all btn-press ${
                isCheckingOut 
                  ? 'bg-[#E5E2D9] cursor-not-allowed text-[#6B6658]' 
                  : 'bg-[#2D2A26] text-white hover:bg-black shadow-lg shadow-black/10'
              }`}
            >
              {isCheckingOut ? (
                <span className="animate-pulse lowercase tracking-widest text-[10px] md:text-xs">Verarbeite...</span>
              ) : (
                <>
                  <CreditCard size={20} className="text-blue-400" />
                  <span>Jetzt Bezahlen</span>
                </>
              )}
            </button>
            
            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-2 md:gap-3 pt-5 md:pt-6">
              {[
                { icon: Lock, text: "SSL" },
                { icon: ShieldCheck, text: "Sicher" },
                { icon: CreditCard, text: "Stripe" },
              ].map((badge, index) => (
                <div key={index} className="flex items-center gap-1.5 text-[10px] md:text-xs text-[#6B6658]">
                  <badge.icon size={12} md:size-14 />
                  <span>{badge.text}</span>
                </div>
              ))}
            </div>
            <p className="text-[9px] md:text-[10px] text-[#6B6658] text-center uppercase tracking-widest mt-3">
              100% Sicherer Checkout
            </p>
          </div>
        </div>
        
        {/* Not logged in warning */}
        {!user && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 p-4 bg-[#F2EFE9] rounded-xl border border-[#E5E2D9] text-center"
          >
            <p className="text-sm text-[#6B6658]">
              <span className="text-[#8A9A5B] font-medium">💡 Tipp:</span> Melde dich an, um deine Einkäufe zu speichern und schneller zur Kasse zu gehen.
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
