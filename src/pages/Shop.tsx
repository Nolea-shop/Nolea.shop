import React, { useEffect, useState } from 'react';
import { RecipeCard } from '../components/RecipeCard';
import { getAllRecipes } from '../services/recipeService';
import { Recipe } from '../types';
import { Filter, ArrowUpDown, Grid, LayoutList, Search as SearchIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function Shop() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('Alle');
  const [sortBy, setSortBy] = useState('default');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const categories = ['Alle', 'Lifestyle', 'Wellness', 'Food', 'Business', 'Quick'];

  useEffect(() => {
    getAllRecipes().then(setRecipes).finally(() => setLoading(false));
  }, []);

  const filteredRecipes = recipes.filter(r => 
    r.isOnline && 
    (category === 'Alle' || r.category.toLowerCase().includes(category.toLowerCase())) &&
    (r.title.toLowerCase().includes(searchTerm.toLowerCase()) || r.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Sort recipes
  const sortedRecipes = [...filteredRecipes].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'name':
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });

  return (
    <div className="bg-[#FAF9F6] min-h-screen py-10 md:py-16">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        {/* Header */}
        <header className="mb-8 md:mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl lg:text-5xl font-serif italic text-[#2D2A26] mb-4"
          >
            Alle Produkte
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-[#6B6658] text-sm md:text-base"
          >
            Entdecke unsere handverlesenen Guides für deinen Alltag.
          </motion.p>
        </header>

        {/* Filter & Controls Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col gap-6 mb-8 pb-6 border-b border-[#E5E2D9]"
        >
          {/* Search Row */}
          <div className="relative w-full max-w-2xl">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B6658]" size={18} />
            <input 
              type="text"
              placeholder="Finde deinen Guide (z.B. Lifestyle, Routine...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-[#E5E2D9] rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#8A9A5B]/30 transition-all font-serif italic"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B6658] hover:text-[#2D2A26] px-2 text-xs font-bold uppercase tracking-widest"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-start lg:items-center justify-between">
            {/* Category Pills */}
            <div className="flex flex-wrap gap-2 items-center w-full lg:w-auto">
              <div className="flex items-center gap-2 text-[#6B6658] mr-2">
                <Filter size={14} />
              </div>
              {categories.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-4 sm:px-5 py-2 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-200 btn-press ${
                    category === cat 
                      ? 'bg-[#8A9A5B] text-white shadow-sm shadow-[#8A9A5B]/30' 
                      : 'bg-white text-[#6B6658] hover:bg-[#F2EFE9] border border-[#E5E2D9]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Right Side Controls */}
            <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
              {/* Product Count */}
              <span className="text-[#6B6658] text-xs">
                {sortedRecipes.length} {sortedRecipes.length === 1 ? 'Produkt' : 'Produkte'}
              </span>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2">
                <ArrowUpDown size={14} className="text-[#6B6658]" />
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white border border-[#E5E2D9] rounded-lg px-3 py-2 text-xs text-[#2D2A26] focus:outline-none focus:ring-2 focus:ring-[#8A9A5B]/30 cursor-pointer"
                >
                  <option value="default">Standard</option>
                  <option value="price-low">Preis: Niedrig</option>
                  <option value="price-high">Preis: Hoch</option>
                  <option value="name">Name A-Z</option>
                </select>
              </div>

              {/* View Mode Toggle (Desktop only) */}
              <div className="hidden md:flex items-center gap-1 bg-white border border-[#E5E2D9] rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-[#8A9A5B] text-white' : 'text-[#6B6658] hover:bg-[#F2EFE9]'}`}
                  title="Grid-Ansicht"
                >
                  <Grid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-[#8A9A5B] text-white' : 'text-[#6B6658] hover:bg-[#F2EFE9]'}`}
                  title="Listen-Ansicht"
                >
                  <LayoutList size={16} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="aspect-square bg-[#F2EFE9] animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : sortedRecipes.length > 0 ? (
          <div className={`grid gap-4 md:gap-6 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
              : 'grid-cols-1'
          }`}>
            {sortedRecipes.map((recipe, index) => (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <RecipeCard recipe={recipe} />
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 md:py-24 bg-white rounded-2xl md:rounded-[2rem] border border-[#E5E2D9]"
          >
            <svg className="w-12 h-12 mx-auto mb-4 text-[#E5E2D9]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <h2 className="text-xl md:text-2xl font-serif italic text-[#2D2A26] mb-2">
              Keine Produkte gefunden
            </h2>
            <p className="text-[#6B6658] text-sm mb-6">
              Es scheint, als hättest du noch keine Guides hinzugefügt.
            </p>
            <button 
              onClick={() => {setCategory('Alle'); setSearchTerm('');}}
              className="btn-press inline-flex items-center gap-2 bg-[#8A9A5B] text-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-[#6B7A46] transition-all"
            >
              Alle Kategorien anzeigen
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
