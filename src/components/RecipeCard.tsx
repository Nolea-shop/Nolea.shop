import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBasket } from 'lucide-react';
import { Recipe } from '../types';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

interface Props {
  recipe: Recipe;
  categoryColor?: {
    bg: string;
    bgLight: string;
    text: string;
    border: string;
    accent: string;
  };
}

export function RecipeCard({ recipe, categoryColor }: Props) {
  const { addToCart } = useCart();
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Fallback to default sage green if no color provided
  const color = categoryColor || {
    bg: '#1F1D1A',
    bgLight: '#F2EFE9',
    text: '#1F1D1A',
    border: '#E5E2D9',
    accent: '#7A8F4E',
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(recipe);
    toast.success(`${recipe.title} added to cart!`, {
      duration: 3000,
      icon: (
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: color.accent }}
        >
          <circle cx="8" cy="21" r="1" />
          <circle cx="19" cy="21" r="1" />
          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
        </svg>
      ),
      style: {
        background: '#FAF9F6',
        color: color.text,
        border: `1px solid ${color.border}`,
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
      className="bg-white p-3 sm:p-4 rounded-2xl shadow-sm border group card-lift-strong relative overflow-hidden transition-all duration-500"
      style={{ borderColor: color.border }}
    >
      {/* Clickable wrapper to product page */}
      <Link
        to={`/product/${recipe.id}`}
        className="block cursor-pointer"
        aria-label={`View ${recipe.title}`}
      >
        {/* Image Container */}
        <div
          className="relative aspect-square mb-3 sm:mb-4 overflow-hidden rounded-xl transition-colors duration-500"
          style={{ backgroundColor: color.bgLight }}
        >
          {!imageLoaded && (
            <div
              className="absolute inset-0 animate-pulse transition-colors duration-500"
              style={{ backgroundColor: color.bgLight }}
            />
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

          {/* Category Badge — uses the recipe's own category color */}
          <div className="absolute top-2 sm:top-3 left-2 sm:left-3">
            <span
              className="font-sans text-[9px] sm:text-[10px] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full uppercase tracking-wider font-bold text-white transition-colors duration-500"
              style={{ backgroundColor: color.accent }}
            >
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
                <span
                  className="px-4 sm:px-5 py-2 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white transition-colors duration-500"
                  style={{ backgroundColor: color.accent }}
                >
                  View Details
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Content */}
        <div className="space-y-2 sm:space-y-2.5">
          <h3
            className="font-serif italic text-base sm:text-lg line-clamp-1 transition-colors duration-500 group-hover:opacity-80"
            style={{ color: color.text }}
          >
            {recipe.title}
          </h3>

          <p
            className="text-[11px] sm:text-xs line-clamp-2 min-h-[32px] leading-relaxed transition-colors duration-500"
            style={{ color: color.text, opacity: 0.6 }}
          >
            {recipe.description}
          </p>
        </div>
      </Link>

      {/* Price & CTA Row — outside Link so button works independently */}
      <div
        className="flex items-center justify-between pt-2 sm:pt-3 mt-2 transition-colors duration-500"
        style={{ borderTop: `1px solid ${color.border}` }}
      >
        <div className="flex flex-col">
          <span
            className="text-[10px] uppercase tracking-wider font-bold transition-colors duration-500"
            style={{ color: color.text, opacity: 0.5 }}
          >
            Price
          </span>
          <span
            className="font-bold text-lg sm:text-xl transition-colors duration-500"
            style={{ color: color.text }}
          >
            {(recipe.price / 100).toFixed(2)}€
          </span>
        </div>

        <motion.button
          onClick={handleAddToCart}
          whileTap={{ scale: 0.95 }}
          className="btn-press flex items-center gap-2 text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-full transition-all duration-500 shadow-md hover:shadow-lg hover:opacity-90"
          style={{ backgroundColor: color.bg }}
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
