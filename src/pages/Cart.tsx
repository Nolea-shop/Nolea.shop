import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { Trash2, ArrowLeft, ArrowRight, CreditCard, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getStripe } from '../lib/stripe';
import toast from 'react-hot-toast';

export function Cart() {
  const { cart, removeFromCart, totalPrice } = useCart();
  const [user] = useAuthState(auth);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const navigate = useNavigate();

  const handleCheckout = async () => {
    if (!user) {
      toast.error('Bitte melde dich an, um fortzufahren.');
      return;
    }

    setIsCheckingOut(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          userId: user.uid,
          userEmail: user.email,
        }),
      });

      const { id } = await response.json();
      const stripe = await getStripe();
      if (stripe) {
        await (stripe as any).redirectToCheckout({ sessionId: id });
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Fehler beim Starten des Checkouts.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="bg-[#FAF9F6] min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-[#F2EFE9] flex items-center justify-center rounded-full mb-8 text-[#6B6658]">
          <ShoppingBag size={48} strokeWidth={1.5} />
        </div>
        <h2 className="text-3xl font-serif italic text-[#2D2A26] mb-4">Dein Warenkorb ist leer</h2>
        <p className="text-[#6B6658] mb-10 max-w-sm text-sm">
          Es scheint, als hättest du noch keine Guides hinzugefügt. Entdecke unsere neuesten digitalen Produkte!
        </p>
        <Link 
          to="/shop" 
          className="bg-[#8A9A5B] text-white px-8 py-3 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-[#6B7A46] transition-all shadow-md"
        >
          Zum Shop <ArrowRight size={18} />
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF9F6] min-h-screen py-16">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center justify-between mb-12">
          <Link to="/shop" className="text-[#6B6658] hover:text-[#8A9A5B] flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors">
            <ArrowLeft size={16} /> Zurück
          </Link>
          <h1 className="text-3xl font-serif italic text-[#2D2A26]">Warenkorb</h1>
        </div>

        <div className="grid grid-cols-1 gap-8">
          <div className="bg-white rounded-[2rem] border border-[#E5E2D9] shadow-sm overflow-hidden flex flex-col md:flex-row">
            <div className="flex-1 divide-y divide-[#F2EFE9]">
              {cart.map(item => (
                <div key={item.id} className="p-8 flex gap-6 items-center">
                  <img src={item.imageUrl} alt={item.title} className="w-20 h-20 rounded-xl object-cover border border-[#E5E2D9]" />
                  <div className="flex-1">
                    <h3 className="font-serif italic text-lg text-[#2D2A26] mb-1">{item.title}</h3>
                    <p className="text-[10px] text-[#6B6658] font-bold uppercase tracking-widest">{item.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#2D2A26] mb-2">{(item.price / 100).toFixed(2)}€</p>
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="text-[#E5E2D9] hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={18} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="w-full md:w-80 bg-[#F2EFE9] p-8 flex flex-col">
              <h4 className="text-[10px] uppercase tracking-widest text-[#6B6658] text-center mb-8 font-bold">Bestellübersicht</h4>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-xs text-[#6B6658]">
                  <span>Zwischensumme</span>
                  <span>{(totalPrice / 100).toFixed(2)}€</span>
                </div>
                <div className="flex justify-between text-xs text-[#6B6658]">
                  <span>MwSt. (7%)</span>
                  <span>{((totalPrice * 0.07) / 100).toFixed(2)}€</span>
                </div>
                <div className="border-t border-[#E5E2D9] pt-4 flex justify-between items-center text-[#2D2A26]">
                  <span className="font-serif italic text-lg text-[#2D2A26]">Gesamt</span>
                  <span className="text-2xl font-bold">{(totalPrice / 100).toFixed(2)}€</span>
                </div>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className={`w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-3 transition-all ${
                    isCheckingOut 
                      ? 'bg-[#E5E2D9] cursor-not-allowed text-[#6B6658]' 
                      : 'bg-[#2D2A26] text-white hover:bg-black shadow-lg shadow-black/10'
                  }`}
                >
                  {isCheckingOut ? (
                    <span className="animate-pulse lowercase tracking-widest text-[10px]">Processing...</span>
                  ) : (
                    <>
                      <span className="text-blue-400 font-black">Stripe</span> Bezahlen
                    </>
                  )}
                </button>
                <div className="flex justify-center gap-4 pt-4 opacity-50">
                  <div className="h-4 w-6 bg-[#6B6658] rounded-sm opacity-20"></div>
                  <div className="h-4 w-6 bg-[#6B6658] rounded-sm opacity-20"></div>
                  <div className="h-4 w-6 bg-[#6B6658] rounded-sm opacity-20"></div>
                </div>
                <p className="text-[9px] text-[#6B6658] text-center uppercase tracking-widest mt-4">Sicherer Checkout</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
