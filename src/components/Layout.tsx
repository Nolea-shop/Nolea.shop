import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBasket, User, LogOut, ShieldCheck, Menu, X, Search, Home, Store } from 'lucide-react';
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

  return (
    <>
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-[#E5E2D9]' 
          : 'bg-white/80 backdrop-blur-md border-b border-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="text-xl sm:text-2xl font-serif font-bold italic tracking-tight text-[#2D2A26] hover:text-[#8A9A5B] transition-colors">
            Nolea
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-6 lg:gap-8 items-center">
            <Link 
              to="/shop" 
              className={`font-sans text-xs font-bold uppercase tracking-widest px-2 py-2 transition-colors ${
                location.pathname === '/shop' ? 'text-[#2D2A26] border-b-2 border-[#8A9A5B]' : 'text-[#6B6658] hover:text-[#2D2A26]'
              }`}
            >
              Shop
            </Link>
            <Link 
              to="/impressum" 
              className="font-sans text-xs font-bold uppercase tracking-widest px-2 py-2 text-[#6B6658] hover:text-[#2D2A26] transition-colors"
            >
              Impressum
            </Link>
            {isAdmin && (
              <Link 
                to="/admin" 
                className="flex items-center gap-1 font-sans text-xs font-bold uppercase tracking-widest text-[#8A9A5B] px-2 py-2"
              >
                <ShieldCheck size={14} /> Admin
              </Link>
            )}
          </div>

          {/* Right Side - Cart & User */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Cart Button */}
            <Link to="/cart" className="relative p-2 sm:p-2.5 text-[#2D2A26] hover:bg-[#F2EFE9] rounded-full transition-colors btn-press">
              <ShoppingBasket size={22} strokeWidth={1.5} />
              {totalItems > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 bg-[#8A9A5B] text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm"
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
                  className="p-2 text-[#6B6658] hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  title="Abmelden"
                >
                  <LogOut size={18} strokeWidth={1.5} />
                </button>
                <div className="bg-[#F2EFE9] px-3 py-1.5 rounded-full text-xs font-medium text-[#2D2A26]">
                  Hallo, {user.displayName?.split(' ')[0] || 'Liebling'}
                </div>
              </div>
            ) : (
              <button 
                onClick={signInWithGoogle}
                className="hidden sm:flex items-center gap-2 p-2 text-[#2D2A26] hover:bg-[#F2EFE9] rounded-full transition-colors"
              >
                <User size={22} strokeWidth={1.5} />
              </button>
            )}

            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-[#2D2A26] hover:bg-[#F2EFE9] rounded-full transition-colors"
              aria-label="Menü"
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
              className="fixed top-0 right-0 bottom-0 w-[80%] max-w-sm bg-white z-50 md:hidden shadow-2xl"
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-[#E5E2D9]">
                  <span className="text-xl font-serif font-bold italic text-[#2D2A26]">Menü</span>
                  <button 
                    onClick={() => setIsMenuOpen(false)}
                    className="p-2 text-[#6B6658] hover:bg-[#F2EFE9] rounded-full"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* User Info (if logged in) */}
                {user && (
                  <div className="p-6 border-b border-[#E5E2D9] bg-[#F2EFE9]/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#8A9A5B] rounded-full flex items-center justify-center text-white font-bold">
                        {user.displayName?.[0] || 'G'}
                      </div>
                      <div>
                        <p className="font-medium text-[#2D2A26]">{user.displayName || 'Gast'}</p>
                        <p className="text-xs text-[#6B6658]">{user.email}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Links */}
                <div className="flex-1 overflow-y-auto py-4">
                  <nav className="px-4 space-y-1">
                    <Link 
                      to="/" 
                      className="flex items-center gap-3 px-4 py-4 text-[#2D2A26] hover:bg-[#F2EFE9] rounded-xl transition-colors"
                    >
                      <span className="text-lg">🏠</span>
                      <span className="font-medium">Startseite</span>
                    </Link>
                    <Link 
                      to="/shop" 
                      className="flex items-center gap-3 px-4 py-4 text-[#2D2A26] hover:bg-[#F2EFE9] rounded-xl transition-colors"
                    >
                      <span className="text-lg">🛍️</span>
                      <span className="font-medium">Shop</span>
                    </Link>
                    <Link 
                      to="/cart" 
                      className="flex items-center gap-3 px-4 py-4 text-[#2D2A26] hover:bg-[#F2EFE9] rounded-xl transition-colors"
                    >
                      <span className="text-lg">🧺</span>
                      <span className="font-medium">Warenkorb</span>
                      {totalItems > 0 && (
                        <span className="ml-auto bg-[#8A9A5B] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {totalItems}
                        </span>
                      )}
                    </Link>
                    <Link 
                      to="/impressum" 
                      className="flex items-center gap-3 px-4 py-4 text-[#2D2A26] hover:bg-[#F2EFE9] rounded-xl transition-colors"
                    >
                      <span className="text-lg">📋</span>
                      <span className="font-medium">Impressum</span>
                    </Link>
                    {isAdmin && (
                      <Link 
                        to="/admin" 
                        className="flex items-center gap-3 px-4 py-4 text-[#8A9A5B] hover:bg-[#F2EFE9] rounded-xl transition-colors"
                      >
                        <span className="text-lg">⚙️</span>
                        <span className="font-medium">Admin</span>
                      </Link>
                    )}
                  </nav>
                </div>

                {/* Footer with Login/Logout */}
                <div className="p-4 border-t border-[#E5E2D9]">
                  {user ? (
                    <button 
                      onClick={() => { auth.signOut(); setIsMenuOpen(false); }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-medium"
                    >
                      <LogOut size={18} /> Abmelden
                    </button>
                  ) : (
                    <button 
                      onClick={() => { signInWithGoogle(); setIsMenuOpen(false); }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#8A9A5B] text-white hover:bg-[#6B7A46] rounded-xl transition-colors font-medium"
                    >
                      <User size={18} /> Mit Google anmelden
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
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E2D9] md:hidden z-40 safe-area-inset-bottom"
      >
        <div className="flex justify-around items-center py-2 px-4">
          <Link 
            to="/" 
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors ${
              location.pathname === '/' ? 'text-[#8A9A5B]' : 'text-[#6B6658]'
            }`}
          >
            <Home size={22} strokeWidth={1.5} />
            <span className="text-[10px] font-medium">Start</span>
          </Link>
          
          <Link 
            to="/shop" 
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors ${
              location.pathname === '/shop' ? 'text-[#8A9A5B]' : 'text-[#6B6658]'
            }`}
          >
            <Store size={22} strokeWidth={1.5} />
            <span className="text-[10px] font-medium">Shop</span>
          </Link>
          
          <Link 
            to="/cart" 
            className={`relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors ${
              location.pathname === '/cart' ? 'text-[#8A9A5B]' : 'text-[#6B6658]'
            }`}
          >
            <ShoppingBasket size={22} strokeWidth={1.5} />
            {totalItems > 0 && (
              <span className="absolute -top-1 right-2 bg-[#8A9A5B] text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
            <span className="text-[10px] font-medium">Warenkorb</span>
          </Link>
          
          {user ? (
            <Link 
              to="/admin" 
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors ${
                location.pathname === '/admin' ? 'text-[#8A9A5B]' : 'text-[#6B6658]'
              }`}
            >
              <User size={22} strokeWidth={1.5} />
              <span className="text-[10px] font-medium">Profil</span>
            </Link>
          ) : (
            <button 
              onClick={signInWithGoogle}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-[#6B6658] transition-colors"
            >
              <User size={22} strokeWidth={1.5} />
              <span className="text-[10px] font-medium">Login</span>
            </button>
          )}
        </div>
      </motion.div>
    </>
  );
}

export function Footer() {
  return (
    <footer className="bg-white border-t border-[#E5E2D9] pt-12 md:pt-16 pb-24 md:pb-24">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 text-[#2D2A26]">
          <div>
            <h3 className="text-xl font-serif font-bold italic mb-4">Nolea</h3>
            <p className="text-[#6B6658] font-serif italic text-sm leading-relaxed">
              Exquisite digitale Produkte für einen bewussten Lebensstil. <br />
              Inspiration, Qualität und Ästhetik in jedem Guide.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#2D2A26] mb-4 md:mb-6">Shop</h4>
            <ul className="flex flex-col gap-2 md:gap-3 text-[#6B6658] text-sm">
              <li><Link to="/shop" className="hover:text-[#8A9A5B] transition-colors">Alle Produkte</Link></li>
              <li><Link to="/shop?cat=lifestyle" className="hover:text-[#8A9A5B] transition-colors">Lifestyle Guides</Link></li>
              <li><Link to="/shop?cat=wellness" className="hover:text-[#8A9A5B] transition-colors">Wellness & Mindset</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#2D2A26] mb-4 md:mb-6">Rechtliches</h4>
            <ul className="flex flex-col gap-2 md:gap-3 text-[#6B6658] text-sm">
              <li><Link to="/impressum" className="hover:text-[#8A9A5B] transition-colors">Impressum</Link></li>
              <li><Link to="/datenschutz" className="hover:text-[#8A9A5B] transition-colors">Datenschutz</Link></li>
              <li><Link to="/agb" className="hover:text-[#8A9A5B] transition-colors">AGB</Link></li>
              <li><Link to="/admin" className="hover:text-[#8A9A5B] transition-colors text-xs opacity-50 mt-2">Admin Terminal</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 md:px-6 mt-10 md:mt-16 pt-6 md:pt-8 border-t border-[#F2EFE9] flex flex-col md:flex-row justify-between items-center text-[10px] text-[#6B6658] uppercase tracking-[0.2em] gap-3 md:gap-4">
          <span>© 2024 Nolea Studio &bull; Alle Rechte vorbehalten</span>
          <div className="flex gap-4 md:gap-6 items-center">
            <span className="flex items-center gap-1.5"><ShoppingBasket size={12}/> Stripe Checkout</span>
            <span className="flex items-center gap-1.5">PayPal Ready</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> System Online
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
