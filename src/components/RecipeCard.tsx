import React from 'react';
import { ShoppingBasket, ArrowRight } from 'lucide-react';
import { Recipe } from '../types';
import { useCart } from '../context/CartContext';
import { motion } from 'motion/react';

interface Props {
  recipe: Recipe;
  key?: string;
}

export function RecipeCard({ recipe }: Props) {
  const { addToCart } = useCart();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white p-4 rounded-2xl shadow-sm border border-[#E5E2D9] group hover:shadow-md transition-shadow"
    >
      <div className="relative aspect-square mb-4 overflow-hidden rounded-xl">
        <img 
          src={recipe.imageUrl} 
          alt={recipe.title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute top-3 left-3">
          <span className="bg-white/90 backdrop-blur-sm text-[#6B6658] font-serif italic text-[10px] px-3 py-1 rounded-full uppercase tracking-widest border border-[#E5E2D9]">
            {recipe.category}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-serif italic text-lg text-[#2D2A26] line-clamp-1">{recipe.title}</h3>
        <p className="text-xs text-[#6B6658] line-clamp-2 min-h-[32px]">
          {recipe.description}
        </p>
        
        <div className="flex items-center justify-between pt-2">
          <span className="font-bold text-[#2D2A26]">
            {(recipe.price / 100).toFixed(2)}€
          </span>
          <button 
            onClick={() => addToCart(recipe)}
            className="p-2.5 bg-[#F2EFE9] text-[#2D2A26] rounded-full hover:bg-[#8A9A5B] hover:text-white transition-colors"
            title="In den Warenkorb"
          >
            <ShoppingBasket size={18} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
