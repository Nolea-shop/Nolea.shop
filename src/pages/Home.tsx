import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Sparkles, Utensils, Heart } from 'lucide-react';
import { RecipeCard } from '../components/RecipeCard';
import { getAllRecipes } from '../services/recipeService';
import { Recipe } from '../types';
import { Link } from 'react-router-dom';

export function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllRecipes().then(setRecipes).finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-[#FAF9F6]">
      {/* Hero Section */}
      <section className="py-8 max-w-7xl mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative h-[400px] rounded-[2.5rem] overflow-hidden bg-[#D9DED1]"
        >
          <img 
            src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80" 
            alt="Hero" 
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent" />
          
          <div className="relative h-full flex flex-col justify-center px-8 md:px-16 text-white max-w-3xl">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] mb-4 text-white/80">
              Neuerscheinung
            </span>
            <h1 className="text-4xl md:text-6xl font-serif italic mb-8 leading-tight">
              Trendige Lifestyle <br /> Guides für dich.
            </h1>
            <Link 
              to="/shop" 
              className="w-fit bg-white text-[#2D2A26] px-8 py-3 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-[#8A9A5B] hover:text-white transition-all shadow-lg"
            >
              Kollektion Entdecken
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Featured Trends */}
      <section className="py-16 max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-3xl font-serif italic text-[#2D2A26] mb-2">Aktuelle Highlights</h2>
            <p className="text-[#6B6658] text-sm font-sans uppercase tracking-[0.1em]">Handverlesene Guides für diese Woche.</p>
          </div>
          <Link to="/shop" className="text-[#8A9A5B] text-sm font-bold uppercase tracking-wider flex items-center gap-2 hover:gap-3 transition-all">
            Alle Produkte <ArrowRight size={16} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="aspect-square bg-[#F2EFE9] animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recipes.slice(0, 3).map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </section>

      {/* Benefits */}
      <section className="bg-white py-24 border-y border-[#E5E2D9]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-16">
          <div className="flex flex-col items-center text-center group">
            <div className="w-16 h-16 bg-[#F2EFE9] text-[#8A9A5B] flex items-center justify-center rounded-3xl mb-6 group-hover:bg-[#8A9A5B] group-hover:text-white transition-all duration-500">
              <Utensils size={28} strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-serif italic mb-3 text-[#2D2A26]">Präzise Anleitung</h3>
            <p className="text-[#6B6658] text-sm leading-relaxed max-w-[250px]">
              Jedes Rezept ist mehrfach getestet und kommt mit Geling-Garantie.
            </p>
          </div>
          <div className="flex flex-col items-center text-center group">
            <div className="w-16 h-16 bg-[#F2EFE9] text-[#8A9A5B] flex items-center justify-center rounded-3xl mb-6 group-hover:bg-[#8A9A5B] group-hover:text-white transition-all duration-500">
              <Sparkles size={28} strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-serif italic mb-3 text-[#2D2A26]">Direkt-Download</h3>
            <p className="text-[#6B6658] text-sm leading-relaxed max-w-[250px]">
              Nach dem Kauf sofortigen Zugriff auf PDFs und Video-Inhalte erhalten.
            </p>
          </div>
          <div className="flex flex-col items-center text-center group">
            <div className="w-16 h-16 bg-[#F2EFE9] text-[#8A9A5B] flex items-center justify-center rounded-3xl mb-6 group-hover:bg-[#8A9A5B] group-hover:text-white transition-all duration-500">
              <Heart size={28} strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-serif italic mb-3 text-[#2D2A26]">Mit Liebe kuratiert</h3>
            <p className="text-[#6B6658] text-sm leading-relaxed max-w-[250px]">
              Wir suchen nur die ästhetischsten Food-Trends für dich aus.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
