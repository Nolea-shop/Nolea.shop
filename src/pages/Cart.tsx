import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { Trash2, ArrowLeft, ArrowRight, CreditCard, ShoppingBag, ShieldCheck, Lock } from 'lucide-react';
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
    setIsCheckingOut(true);
    try {
      console.log('[Checkout] Starting checkout for User:', user?.uid ?? 'Guest', user?.email ?? 'Guest');
      console.log('[Checkout] Cart items:', cart.length);

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          userId: user?.uid ?? null,
          userEmail: user?.email ?? null,
        }),
      });

      console.log('[Checkout] Server response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Server error: ${response.status} ${response.statusText} - ${errorData.error || 'Unknown error'}`);
      }

      const { url } = await response.json();
      console.log('[Checkout] Server response data:', { url });

      if (url) {
        window.location.href = url;
      }
      console.log('[Checkout] Redirect to Stripe successful');
    } catch (error: any) {
      console.error('[Checkout] Error:', error);
      toast.error(`Checkout failed: ${error.message || 'Unknown error'}`, {
        duration: 5000,
        style: {
          background: '#FEF2F2',
          color: '#C45B4A',
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
        <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-[#F2EFE9] to-[#E5E2D9] flex items-center justify-center rounded-full mb-8 text-[#7A8F4E]">
          <ShoppingBag size={48} strokeWidth={1.5} />
        </div>
        <h2 className="text-2xl md:text-3xl font-serif italic text-[#1F1D1A] mb-4">
          Your cart is empty
        </h2>
        <p className="text-[#5C5748] mb-6 md:mb-8 max-w-sm text-sm md:text-base leading-relaxed">
          Looks like you have not added any guides yet. Discover our handpicked digital products!
        </p>
        <Link
          to="/shop"
          className="btn-press bg-[#7A8F4E] text-white px-8 md:px-10 py-3 md:py-4 rounded-full text-xs md:text-sm font-bold uppercase tracking-wider hover:bg-[#5C6F3A] transition-all shadow-md hover:shadow-lg flex items-center gap-2"
        >
          Go to Shop <ArrowRight size={18} />
        </Link>

        {/* Trust Badges for Empty State */}
        <div className="flex flex-wrap justify-center gap-4 mt-12 md:mt-16 px-4">
          {[
            { icon: Lock, text: 'Secure Checkout' },
            { icon: ShieldCheck, text: 'Buyer Protection' },
          ].map((badge, index) => (
            <div
              key={index}
              className="flex items-center gap-2 text-xs text-[#5C5748] bg-white px-4 py-2 rounded-full border border-[#E5E2D9]"
            >
              <badge.icon size={14} className="text-[#7A8F4E]" />
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
          <Link
            to="/shop"
            className="text-[#5C5748] hover:text-[#7A8F4E] flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors"
          >
            <ArrowLeft size={16} /> Back to Shop
          </Link>
          <h1 className="text-2xl md:text-3xl font-serif italic text-[#1F1D1A]">Shopping Cart</h1>
        </div>

        {/* Cart Content */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Cart Items */}
          <div className="flex-1 bg-white rounded-2xl md:rounded-[2rem] border border-[#E5E2D9] shadow-sm overflow-hidden">
            <div className="divide-y divide-[#F2EFE9]">
              {cart.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 md:p-6 flex gap-4 md:gap-6 items-center"
                >
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-[#F2EFE9] flex-shrink-0 overflow-hidden border border-[#E5E2D9]">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full blur-placeholder" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif italic text-base md:text-lg text-[#1F1D1A] mb-1 truncate">
                      {item.title}
                    </h3>
                    <p className="text-[10px] md:text-xs text-[#5C5748] font-bold uppercase tracking-widest">
                      {item.category}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-base md:text-lg text-[#1F1D1A] mb-2">
                      {(item.price / 100).toFixed(2)}€
                    </p>
                    <button
                      onClick={() => {
                        removeFromCart(item.id);
                        toast.success(`${item.title} removed`, {
                          icon: '🗑️',
                          duration: 2000,
                        });
                      }}
                      className="text-[#C5C2B9] hover:text-red-400 transition-colors p-1"
                      aria-label={`Remove ${item.title} from cart`}
                    >
                      <Trash2 size={18} strokeWidth={1.5} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="w-full lg:w-80 xl:w-96 flex-shrink-0">
            <div className="bg-white rounded-2xl md:rounded-[2rem] border border-[#E5E2D9] shadow-sm p-6 md:p-8 sticky top-24">
              <h4 className="text-[10px] uppercase tracking-widest text-[#5C5748] text-center mb-6 font-bold">
                Order Summary
              </h4>

              <div className="space-y-3 md:space-y-4 mb-6">
                <div className="flex justify-between text-xs md:text-sm text-[#5C5748]">
                  <span>
                    Subtotal ({cart.length} {cart.length === 1 ? 'item' : 'items'})
                  </span>
                  <span>{(totalPrice / 100).toFixed(2)}€</span>
                </div>
                <div className="flex justify-between text-xs md:text-sm text-[#5C5748]">
                  <span>VAT (7%)</span>
                  <span>{((totalPrice * 0.07) / 100).toFixed(2)}€</span>
                </div>
                <div className="border-t border-[#E5E2D9] pt-4 flex justify-between items-center">
                  <span className="font-serif italic text-lg md:text-xl text-[#1F1D1A]">Total</span>
                  <span className="text-xl md:text-2xl font-bold text-[#1F1D1A]">
                    {(totalPrice / 100).toFixed(2)}€
                  </span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={isCheckingOut}
                className={`w-full py-4 md:py-5 rounded-xl font-bold text-sm md:text-base flex items-center justify-center gap-3 transition-all btn-press ${
                  isCheckingOut
                    ? 'bg-[#E5E2D9] cursor-not-allowed text-[#5C5748]'
                    : 'bg-[#1F1D1A] text-white hover:bg-black shadow-lg shadow-black/10'
                }`}
              >
                {isCheckingOut ? (
                  <span className="animate-pulse lowercase tracking-widest text-[10px] md:text-xs">
                    Processing...
                  </span>
                ) : (
                  <>
                    <CreditCard size={20} />
                    <span>Pay Now</span>
                  </>
                )}
              </button>

              {/* Trust Badges */}
              <div className="flex flex-wrap justify-center gap-2 md:gap-3 pt-5 md:pt-6">
                {[
                  { icon: Lock, text: 'SSL' },
                  { icon: ShieldCheck, text: 'Secure' },
                  { icon: CreditCard, text: 'Stripe' },
                ].map((badge, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1.5 text-[10px] md:text-xs text-[#5C5748]"
                  >
                    <badge.icon size={12} />
                    <span>{badge.text}</span>
                  </div>
                ))}
              </div>
              <p className="text-[9px] md:text-[10px] text-[#5C5748] text-center uppercase tracking-widest mt-3">
                100% Secure Checkout
              </p>
            </div>
          </div>
        </div>

        {/* Guest checkout notice */}
        {!user && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 p-4 bg-[#F2EFE9] rounded-xl border border-[#E5E2D9] text-center"
          >
            <p className="text-sm text-[#5C5748]">
              <span className="text-[#7A8F4E] font-medium">Guest Checkout:</span> You can pay directly via Stripe without signing in. After successful payment, you will receive your downloads via email.
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
