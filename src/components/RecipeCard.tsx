import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBasket } from 'lucide-react';
import { Recipe } from '../types';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

interface Props {
  recipe: Recipe;
}

export function RecipeCard({ recipe }: Props) {
  const { addToCart } = useCart();
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(recipe);
    toast.success(`${recipe.title} added to cart!`, {
      duration: 3000,
      icon: (
        <svg
          className="w-5 h-5 text-[#7A8F4E]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="8" cy="21" r="1" />
          <circle cx="19" cy="21" r="1" />
          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
        </svg>
      ),
      style: {
        background: '#FAF9F6',
        color: '#1F1D1A',
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
      className="bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-[#E5E2D9] group card-lift-strong relative overflow-hidden"
    >
      {/* Clickable wrapper to product page */}
      <Link
        to={`/product/${recipe.id}`}
        className="block cursor-pointer"
        aria-label={`View ${recipe.title}`}
      >
        {/* Image Container */}
        <div className="relative aspect-square mb-3 sm:mb-4 overflow-hidden rounded-xl bg-[#F2EFE9]">
          {!imageLoaded && (
            <div className="absolute inset-0 blur-placeholder" />
          )}
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className={`w-full h-full object-cover transition-transform duration-700 ${
              isHovered ? 'scale-105' : 'scale-100'
            }`}
            onLoad={() => setImageLoaded(true)}
            style={{ opacity: imageLoaded ? 1 : 0 }}
            loading="lazy"
          />

          {/* Category Badge */}
          <div className="absolute top-2 sm:top-3 left-2 sm:left-3">
            <span className="liquid-glass text-[#5C5748] font-sans text-[9px] sm:text-[10px] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full uppercase tracking-wider font-bold">
              {recipe.category}
            </span>
          </div>

          {/* Hover Overlay */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center"
              >
                <span className="liquid-glass text-[#1F1D1A] px-4 sm:px-5 py-2 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                  View Details
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Content */}
        <div className="space-y-2 sm:space-y-2.5">
          <h3 className="font-serif italic text-base sm:text-lg text-[#1F1D1A] line-clamp-1 group-hover:text-[#7A8F4E] transition-colors">
            {recipe.title}
          </h3>

          <p className="text-[11px] sm:text-xs text-[#5C5748] line-clamp-2 min-h-[32px] leading-relaxed">
            {recipe.description}
          </p>
        </div>
      </Link>

      {/* Price & CTA Row — outside Link so button works independently */}
      <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-[#F2EFE9] mt-2">
        <div className="flex flex-col">
          <span className="text-[10px] text-[#5C5748] uppercase tracking-wider font-bold">
            Price
          </span>
          <span className="font-bold text-lg sm:text-xl text-[#1F1D1A]">
            {(recipe.price / 100).toFixed(2)}€
          </span>
        </div>

        <motion.button
          onClick={handleAddToCart}
          whileTap={{ scale: 0.95 }}
          className="btn-press flex items-center gap-2 bg-[#1F1D1A] text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-full hover:bg-[#7A8F4E] transition-colors duration-300 shadow-md"
          title="Add to cart"
        >
          <ShoppingBasket size={16} strokeWidth={1.5} />
          <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">
            Add
          </span>
        </motion.button>
      </div>
    </motion.div>
  );
}
