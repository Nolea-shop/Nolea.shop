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
      {/* Hero Section - Improved for Mobile & Conversion */}
      <section className="py-4 md:py-8 max-w-7xl mx-auto px-4 md:px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative h-[320px] sm:h-[400px] md:h-[450px] rounded-2xl sm:rounded-[2rem] md:rounded-[2.5rem] overflow-hidden bg-[#D9DED1]"
        >
          <img 
            src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80" 
            alt="Handverlesene Lifestyle Guides" 
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/30 to-black/10" />
          
          {/* Decorative elements */}
          <div className="absolute top-6 right-6 w-24 h-24 bg-[#8A9A5B]/20 rounded-full blur-2xl"></div>
          <div className="absolute bottom-20 left-4 w-16 h-16 bg-[#8A9A5B]/30 rounded-full blur-xl"></div>
          
          <div className="relative h-full flex flex-col justify-end sm:justify-center pb-8 sm:pb-0 px-6 sm:px-12 md:px-16 text-white max-w-2xl md:max-w-3xl">
            <motion.span 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] mb-3 sm:mb-4 text-white/90"
            >
              <span className="w-1.5 h-1.5 bg-[#8A9A5B] rounded-full animate-pulse"></span>
              Neu & Exklusiv
            </motion.span>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif italic mb-4 sm:mb-6 md:mb-8 leading-tight"
            >
              Dein Guide für <br className="hidden sm:block" />
              <span className="text-[#D9DED1]">bewusstes Leben</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="hidden sm:block text-sm md:text-base text-white/80 mb-6 md:mb-8 max-w-md font-light"
            >
              Entdecke handverlesene digitale Guides für Food, Wellness & Lifestyle – kuratiert mit Liebe zum Detail.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap gap-3"
            >
              <Link 
                to="/shop" 
                className="btn-press inline-flex items-center gap-2 bg-white text-[#2D2A26] px-6 sm:px-8 py-3 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider hover:bg-[#8A9A5B] hover:text-white transition-all duration-300 shadow-lg shadow-black/10"
              >
                Kollektion Entdecken
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                to="/shop?cat=lifestyle" 
                className="btn-press inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-6 sm:px-8 py-3 rounded-full text-xs sm:text-sm font-medium uppercase tracking-wider border border-white/30 hover:bg-white/30 transition-all"
              >
                Für Frauen
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Featured Trends - Improved with Staggered Animations */}
      <section className="py-12 md:py-16 max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 md:mb-10 gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-serif italic text-[#2D2A26] mb-2">Aktuelle Highlights</h2>
            <p className="text-[#6B6658] text-xs md:text-sm font-sans uppercase tracking-[0.1em]">Handverlesene Guides für dich.</p>
          </div>
          <Link to="/shop" className="group text-[#8A9A5B] text-xs md:text-sm font-bold uppercase tracking-wider flex items-center gap-2 hover:gap-3 transition-all duration-300">
            Alle Produkte <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="aspect-square bg-[#F2EFE9] animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {recipes.slice(0, 3).map((recipe, index) => (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
              >
                <RecipeCard recipe={recipe} />
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Benefits - Improved with Staggered Animations */}
      <section className="bg-white py-16 md:py-24 border-y border-[#E5E2D9]">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16">
            {[
              { 
                icon: Utensils, 
                title: "Präzise Anleitung", 
                desc: "Jedes Rezept ist mehrfach getestet und kommt mit Geling-Garantie.",
                delay: 0
              },
              { 
                icon: Sparkles, 
                title: "Sofort-Download", 
                desc: "Nach dem Kauf sofortigen Zugriff auf PDFs und Video-Inhalte erhalten.",
                delay: 0.1
              },
              { 
                icon: Heart, 
                title: "Mit Liebe kuratiert", 
                desc: "Wir suchen nur die ästhetischsten Food-Trends für dich aus.",
                delay: 0.2
              }
            ].map((item, index) => (
              <motion.div 
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: item.delay }}
                className="flex flex-col items-center text-center group cursor-default"
              >
                <div className="w-14 h-14 md:w-16 md:h-16 bg-[#F2EFE9] text-[#8A9A5B] flex items-center justify-center rounded-2xl md:rounded-3xl mb-5 md:mb-6 group-hover:bg-[#8A9A5B] group-hover:text-white group-hover:scale-110 transition-all duration-300 shadow-sm group-hover:shadow-md">
                  <item.icon size={24} md:w-7 md:h-7 strokeWidth={1.5} />
                </div>
                <h3 className="text-base md:text-lg font-serif italic mb-2 md:mb-3 text-[#2D2A26]">{item.title}</h3>
                <p className="text-[#6B6658] text-xs md:text-sm leading-relaxed max-w-[250px]">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Trust Section - New */}
      <section className="py-12 md:py-16 max-w-7xl mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-br from-[#F2EFE9] to-[#FAF9F6] rounded-2xl md:rounded-[2rem] p-6 md:p-10 text-center border border-[#E5E2D9]"
        >
          <h2 className="text-xl md:text-2xl font-serif italic text-[#2D2A26] mb-4">
            Vertrauen ist gut. <span className="gradient-text">Kaufen ist besser.</span>
          </h2>
          <p className="text-[#6B6658] text-sm md:text-base max-w-lg mx-auto mb-8">
            Sichere dir jetzt deinen Guide und starte noch heute in dein bewusstes Leben. 
            Digitale Produkte zum sofortigen Download.
          </p>
          <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-8">
            {[
              { text: "SSL Verschlüsselt", icon: "🔒" },
              { text: "Sofortiger Zugang", icon: "⚡" },
              { text: "30 Tage Rückgabe", icon: "💚" },
            ].map(item => (
              <div key={item.text} className="flex items-center gap-2 text-xs md:text-sm text-[#6B6658] bg-white px-4 py-2 rounded-full border border-[#E5E2D9]">
                <span>{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
          <Link 
            to="/shop" 
            className="btn-press inline-flex items-center gap-2 bg-[#8A9A5B] text-white px-8 md:px-10 py-3 md:py-4 rounded-full text-xs md:text-sm font-bold uppercase tracking-wider hover:bg-[#6B7A46] transition-all shadow-md hover:shadow-lg"
          >
            Jetzt Guide sichern <ArrowRight size={16} />
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
