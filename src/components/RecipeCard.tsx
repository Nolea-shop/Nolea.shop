import React, { useState } from 'react';
import { ShoppingBasket, ArrowRight, Eye } from 'lucide-react';
import { Recipe } from '../types';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

interface Props {
  recipe: Recipe;
  key?: string;
}

export function RecipeCard({ recipe }: Props) {
  const { addToCart } = useCart();
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(recipe);
    toast.success(`${recipe.title} wurde hinzugefügt!`, {
      duration: 3000,
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="21" r="1"/>
          <circle cx="19" cy="21" r="1"/>
          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
        </svg>
      ),
      style: {
        background: '#FAF9F6',
        color: '#2D2A26',
        border: '1px solid #E5E2D9',
        borderRadius: '1rem',
        padding: '12px 20px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      },
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-[#E5E2D9] group card-lift cursor-pointer relative overflow-hidden"
    >
      {/* Image Container */}
      <div className="relative aspect-square mb-3 sm:mb-4 overflow-hidden rounded-xl bg-[#F2EFE9]">
        {!imageLoaded && (
          <div className="absolute inset-0 animate-pulse bg-[#F2EFE9]" />
        )}
        <img 
          src={recipe.imageUrl} 
          alt={recipe.title} 
          className={`w-full h-full object-cover transition-transform duration-500 ${isHovered ? 'scale-110' : 'scale-100'}`}
          onLoad={() => setImageLoaded(true)}
          style={{ opacity: imageLoaded ? 1 : 0 }}
        />
        
        {/* Category Badge */}
        <div className="absolute top-2 sm:top-3 left-2 sm:left-3">
          <span className="bg-white/90 backdrop-blur-sm text-[#6B6658] font-serif italic text-[9px] sm:text-[10px] px-2 sm:px-3 py-1 sm:py-1.5 rounded-full uppercase tracking-wider border border-[#E5E2D9] shadow-sm">
            {recipe.category}
          </span>
        </div>

        {/* Quick View Overlay */}
        <AnimatePresence>
          {isHovered && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center"
            >
              <div className="flex gap-2">
                <span className="bg-white text-[#2D2A26] px-4 sm:px-5 py-2 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg">
                  <Eye size={12} /> Vorschau
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content */}
      <div className="space-y-2 sm:space-y-2.5">
        <h3 className="font-serif italic text-base sm:text-lg text-[#2D2A26] line-clamp-1 group-hover:text-[#8A9A5B] transition-colors">
          {recipe.title}
        </h3>
        
        <p className="text-[11px] sm:text-xs text-[#6B6658] line-clamp-2 min-h-[32px] leading-relaxed">
          {recipe.description}
        </p>
        
        {/* Price & CTA Row */}
        <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-[#F2EFE9]">
          <div className="flex flex-col">
            <span className="text-[10px] text-[#6B6658] uppercase tracking-wider">Preis</span>
            <span className="font-bold text-lg sm:text-xl text-[#2D2A26]">{(recipe.price / 100).toFixed(2)}€</span>
          </div>
          
          <motion.button 
            onClick={handleAddToCart}
            whileTap={{ scale: 0.95 }}
            className="btn-press flex items-center gap-2 bg-[#8A9A5B] text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-full hover:bg-[#6B7A46] transition-colors shadow-md hover:shadow-lg"
            title="In den Warenkorb"
          >
            <ShoppingBasket size={16} strokeWidth={1.5} />
            <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">Add</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
