import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBasket, User, LogOut, Menu, X, Home, Store, Info, Shield } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { auth, signInWithGoogle } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { motion, AnimatePresence } from 'motion/react';

export function Navigation() {
  const [user] = useAuthState(auth);
  const { totalItems } = useCart();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [cartAnimate, setCartAnimate] = useState(false);

  // Trigger animation when items change
  useEffect(() => {
    if (totalItems > 0) {
      setCartAnimate(true);
      const timer = setTimeout(() => setCartAnimate(false), 300);
      return () => clearTimeout(timer);
    }
  }, [totalItems]);

  const isAdmin = user?.email === 'julianlegendstar@gmail.com';

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Handle scroll for sticky effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/shop', label: 'Shop', icon: Store },
    { to: '/cart', label: 'Cart', icon: ShoppingBasket },
  ];

  return (
    <>
      <nav
        className={`sticky top-0 z-50 transition-all duration-500 ${
          isScrolled
            ? 'liquid-glass-strong border-b border-[#E5E2D9]/60'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
          {/* Logo */}
          <Link
            to="/"
            className="text-xl sm:text-2xl font-serif font-bold italic tracking-tight text-[#1F1D1A] hover:text-[#7A8F4E] transition-colors duration-300"
          >
            Nolea
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-1 lg:gap-2 items-center">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  location.pathname === link.to
                    ? 'text-[#1F1D1A] bg-[#F2EFE9]'
                    : 'text-[#5C5748] hover:text-[#1F1D1A] hover:bg-[#F2EFE9]/50'
                }`}
              >
                {link.label}
                {location.pathname === link.to && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 bg-[#F2EFE9] rounded-xl -z-10"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-[#5C5748] hover:text-[#1F1D1A] hover:bg-[#F2EFE9]/50 transition-all"
              >
                <Shield size={14} />
                Admin
              </Link>
            )}
          </div>

          {/* Right Side - Cart & User */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Cart Button */}
            <Link
              to="/cart"
              className="relative p-2.5 sm:p-3 text-[#1F1D1A] hover:bg-[#F2EFE9] rounded-xl transition-colors btn-press touch-target"
              aria-label={`Shopping cart with ${totalItems} items`}
            >
              <motion.div
                animate={cartAnimate ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                <ShoppingBasket size={22} strokeWidth={1.5} />
              </motion.div>
              {totalItems > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 bg-[#7A8F4E] text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm"
                >
                  {totalItems > 9 ? '9+' : totalItems}
                </motion.span>
              )}
            </Link>

            {/* User Button */}
            {user ? (
              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={() => auth.signOut()}
                  className="p-2.5 text-[#5C5748] hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  title="Sign out"
                >
                  <LogOut size={18} strokeWidth={1.5} />
                </button>
                <div className="bg-[#F2EFE9] px-3 py-1.5 rounded-full text-xs font-medium text-[#1F1D1A]">
                  Hi, {user.displayName?.split(' ')[0] || 'there'}
                </div>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="hidden sm:flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#1F1D1A] hover:bg-[#F2EFE9] rounded-xl transition-colors"
              >
                <User size={18} strokeWidth={1.5} />
                <span>Sign In</span>
              </button>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2.5 text-[#1F1D1A] hover:bg-[#F2EFE9] rounded-xl transition-colors touch-target"
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-[#FAF9F6] z-50 md:hidden shadow-2xl"
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-[#E5E2D9]">
                  <span className="text-xl font-serif font-bold italic text-[#1F1D1A]">Menu</span>
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="p-2.5 text-[#5C5748] hover:bg-[#F2EFE9] rounded-xl touch-target"
                    aria-label="Close menu"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* User Info (if logged in) */}
                {user && (
                  <div className="p-6 border-b border-[#E5E2D9] bg-[#F2EFE9]/50">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#7A8F4E] rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {user.displayName?.[0] || 'G'}
                      </div>
                      <div>
                        <p className="font-medium text-[#1F1D1A]">{user.displayName || 'Guest'}</p>
                        <p className="text-xs text-[#5C5748]">{user.email}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Links */}
                <div className="flex-1 overflow-y-auto py-4">
                  <nav className="px-4 space-y-1">
                    {navLinks.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        className={`flex items-center gap-3 px-4 py-4 rounded-xl transition-colors text-base font-medium ${
                          location.pathname === link.to
                            ? 'bg-[#F2EFE9] text-[#1F1D1A]'
                            : 'text-[#5C5748] hover:bg-[#F2EFE9]/50'
                        }`}
                      >
                        <link.icon size={20} strokeWidth={1.5} />
                        <span>{link.label}</span>
                        {link.to === '/cart' && totalItems > 0 && (
                          <span className="ml-auto bg-[#7A8F4E] text-white text-xs font-bold px-2.5 py-1 rounded-full">
                            {totalItems}
                          </span>
                        )}
                      </Link>
                    ))}
                    <Link
                      to="/impressum"
                      className="flex items-center gap-3 px-4 py-4 text-[#5C5748] hover:bg-[#F2EFE9]/50 rounded-xl transition-colors text-base font-medium"
                    >
                      <Info size={20} strokeWidth={1.5} />
                      <span>Legal Notice</span>
                    </Link>
                  </nav>
                </div>

                {/* Footer with Login/Logout */}
                <div className="p-4 border-t border-[#E5E2D9]">
                  {user ? (
                    <button
                      onClick={() => { auth.signOut(); setIsMenuOpen(false); }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-medium touch-target"
                    >
                      <LogOut size={18} /> Sign Out
                    </button>
                  ) : (
                    <button
                      onClick={() => { signInWithGoogle(); setIsMenuOpen(false); }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-[#7A8F4E] text-white hover:bg-[#5C6F3A] rounded-xl transition-colors font-medium touch-target"
                    >
                      <User size={18} /> Sign In with Google
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation Bar */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 liquid-glass-strong border-t border-[#E5E2D9]/60 md:hidden z-40 pb-safe"
      >
        <div className="flex justify-around items-center py-2 px-2">
          {[
            { to: '/', label: 'Home', icon: Home },
            { to: '/shop', label: 'Shop', icon: Store },
            { to: '/cart', label: 'Cart', icon: ShoppingBasket },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors min-w-[64px] touch-target ${
                location.pathname === item.to ? 'text-[#7A8F4E]' : 'text-[#5C5748]'
              }`}
            >
              <div className="relative">
                <item.icon size={24} strokeWidth={1.5} />
                {item.to === '/cart' && totalItems > 0 && (
                  <span className="absolute -top-2 -right-2.5 bg-[#7A8F4E] text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </motion.div>
    </>
  );
}

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-[#E5E2D9] pt-12 md:pt-16 pb-28 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12 text-[#1F1D1A]">
          {/* Brand */}
          <div className="md:col-span-1">
            <h3 className="text-2xl font-serif font-bold italic mb-4">Nolea</h3>
            <p className="text-[#5C5748] text-sm leading-relaxed max-w-xs">
              Curated digital guides for a conscious lifestyle. Quality, inspiration, and aesthetics in every product.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#1F1D1A] mb-4 md:mb-6">
              Shop
            </h4>
            <ul className="flex flex-col gap-2.5 md:gap-3 text-[#5C5748] text-sm">
              <li>
                <Link to="/shop" className="hover:text-[#7A8F4E] transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link to="/shop?cat=lifestyle" className="hover:text-[#7A8F4E] transition-colors">
                  Lifestyle Guides
                </Link>
              </li>
              <li>
                <Link to="/shop?cat=wellness" className="hover:text-[#7A8F4E] transition-colors">
                  Wellness & Mindset
                </Link>
              </li>
              <li>
                <Link to="/shop?cat=food" className="hover:text-[#7A8F4E] transition-colors">
                  Food & Nutrition
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#1F1D1A] mb-4 md:mb-6">
              Support
            </h4>
            <ul className="flex flex-col gap-2.5 md:gap-3 text-[#5C5748] text-sm">
              <li>
                <Link to="/impressum" className="hover:text-[#7A8F4E] transition-colors">
                  Legal Notice
                </Link>
              </li>
              <li>
                <span className="hover:text-[#7A8F4E] transition-colors cursor-pointer">
                  Privacy Policy
                </span>
              </li>
              <li>
                <span className="hover:text-[#7A8F4E] transition-colors cursor-pointer">
                  Terms of Service
                </span>
              </li>
              <li>
                <span className="hover:text-[#7A8F4E] transition-colors cursor-pointer">
                  Contact
                </span>
              </li>
            </ul>
          </div>

          {/* Trust */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#1F1D1A] mb-4 md:mb-6">
              Trust & Safety
            </h4>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm text-[#5C5748]">
                <Shield size={16} className="text-[#7A8F4E]" />
                <span>SSL Encrypted</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#5C5748]">
                <ShoppingBasket size={16} className="text-[#7A8F4E]" />
                <span>Stripe Checkout</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#5C5748]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#7A8F4E]">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span>Buyer Protection</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 md:mt-16 pt-6 md:pt-8 border-t border-[#F2EFE9] flex flex-col md:flex-row justify-between items-center text-xs text-[#5C5748] gap-3">
          <span>© {currentYear} Nolea Studio. All rights reserved.</span>
          <div className="flex gap-4 md:gap-6 items-center">
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Secure Payment
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
              30-Day Returns
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
