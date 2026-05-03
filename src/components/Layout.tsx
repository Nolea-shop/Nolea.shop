import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBasket, User, LogOut, ShieldCheck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { auth, signInWithGoogle } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

export function Navigation() {
  const [user] = useAuthState(auth);
  const { totalItems } = useCart();
  const location = useLocation();

  const isAdmin = user?.email === 'julianlegendstar@gmail.com';

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#E5E2D9]">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-serif font-bold italic tracking-tight text-[#2D2A26]">
          Nolea
        </Link>

        <div className="hidden md:flex gap-8 items-center">
          <Link 
            to="/shop" 
            className={`font-sans text-xs font-bold uppercase tracking-widest px-3 py-2 transition-colors ${
              location.pathname === '/shop' ? 'text-[#2D2A26] border-b-2 border-[#8A9A5B]' : 'text-[#6B6658] hover:text-[#2D2A26]'
            }`}
          >
            Shop
          </Link>
          <Link 
            to="/impressum" 
            className="font-sans text-xs font-bold uppercase tracking-widest text-[#6B6658] hover:text-[#2D2A26] px-3 py-2"
          >
            Impressum
          </Link>
          {isAdmin && (
            <Link 
              to="/admin" 
              className="flex items-center gap-1 font-sans text-xs font-bold uppercase tracking-widest text-[#8A9A5B] px-3 py-2"
            >
              <ShieldCheck size={16} /> Admin
            </Link>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Link to="/cart" className="relative p-2 text-[#2D2A26] hover:bg-[#F2EFE9] rounded-full transition-colors">
            <ShoppingBasket size={24} strokeWidth={1.5} />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#8A9A5B] text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                {totalItems}
              </span>
            )}
          </Link>

          {user ? (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => auth.signOut()}
                className="p-2 text-[#6B6658] hover:text-red-600 transition-colors"
                title="Abmelden"
              >
                <LogOut size={20} strokeWidth={1.5} />
              </button>
              <div className="bg-[#F2EFE9] px-3 py-1 rounded-full text-xs font-medium text-[#2D2A26] hidden sm:block">
                Hallo, {user.displayName?.split(' ')[0] || 'Gourmet'}
              </div>
            </div>
          ) : (
            <button 
              onClick={signInWithGoogle}
              className="flex items-center gap-2 p-2 text-[#2D2A26] hover:bg-[#F2EFE9] rounded-full transition-colors"
            >
              <User size={24} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="bg-white border-t border-[#E5E2D9] pt-16 pb-24">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 text-[#2D2A26]">
        <div>
          <h3 className="text-xl font-serif font-bold italic mb-4">Nolea</h3>
          <p className="text-[#6B6658] font-serif italic text-sm leading-relaxed">
            Exquisite digitale Produkte für einen bewussten Lebensstil. <br />
            Inspiration, Qualität und Ästhetik in jedem Guide.
          </p>
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-[#2D2A26] mb-6">Shop</h4>
          <ul className="flex flex-col gap-3 text-[#6B6658] text-sm">
            <li><Link to="/shop" className="hover:text-[#8A9A5B] transition-colors">Alle Produkte</Link></li>
            <li><Link to="/shop?cat=lifestyle" className="hover:text-[#8A9A5B] transition-colors">Lifestyle Guides</Link></li>
            <li><Link to="/shop?cat=wellness" className="hover:text-[#8A9A5B] transition-colors">Wellness & Mindset</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-[#2D2A26] mb-6">Rechtliches</h4>
          <ul className="flex flex-col gap-3 text-[#6B6658] text-sm">
            <li><Link to="/impressum" className="hover:text-[#8A9A5B] transition-colors">Impressum</Link></li>
            <li><Link to="/datenschutz" className="hover:text-[#8A9A5B] transition-colors">Datenschutz</Link></li>
            <li><Link to="/agb" className="hover:text-[#8A9A5B] transition-colors">AGB</Link></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-[#F2EFE9] flex flex-col md:flex-row justify-between items-center text-[10px] text-[#6B6658] uppercase tracking-[0.2em] gap-4">
        <span>© 2024 Nolea Studio &bull; Alle Rechte vorbehalten</span>
        <div className="flex gap-6 items-center">
          <span className="flex items-center gap-1.5"><ShoppingBasket size={12}/> Stripe Checkout</span>
          <span className="flex items-center gap-1.5">PayPal Ready</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> System Online
          </span>
        </div>
      </div>
    </footer>
  );
}
