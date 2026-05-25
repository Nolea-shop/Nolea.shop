import React, { useEffect, useState, useMemo } from 'react';
import { RecipeCard } from '../components/RecipeCard';
import { getAllRecipes } from '../services/recipeService';
import { Recipe } from '../types';
import { ArrowUpDown, Grid, LayoutList, Search as SearchIcon, SlidersHorizontal } from 'lucide-react';
import { motion } from 'motion/react';

// Category color system — each category has its own identity
const CATEGORY_COLORS: Record<string, {
  bg: string;
  bgLight: string;
  bgUltraLight: string;
  text: string;
  border: string;
  gradient: string;
  accent: string;
}> = {
  'All': {
    bg: '#1F1D1A',
    bgLight: '#F2EFE9',
    bgUltraLight: '#FAF9F6',
    text: '#1F1D1A',
    border: '#E5E2D9',
    gradient: 'from-[#F2EFE9] to-[#FAF9F6]',
    accent: '#7A8F4E',
  },
  'Tech': {
    bg: '#2563EB',
    bgLight: '#DBEAFE',
    bgUltraLight: '#EFF6FF',
    text: '#1E3A5F',
    border: '#BFDBFE',
    gradient: 'from-[#DBEAFE] to-[#EFF6FF]',
    accent: '#2563EB',
  },
  'Fitness': {
    bg: '#DC2626',
    bgLight: '#FEE2E2',
    bgUltraLight: '#FEF2F2',
    text: '#7F1D1D',
    border: '#FECACA',
    gradient: 'from-[#FEE2E2] to-[#FEF2F2]',
    accent: '#DC2626',
  },
  'Nutrition': {
    bg: '#7A8F4E',
    bgLight: '#E8F0D8',
    bgUltraLight: '#F4F8EE',
    text: '#3D4F1F',
    border: '#D4E0C0',
    gradient: 'from-[#E8F0D8] to-[#F4F8EE]',
    accent: '#7A8F4E',
  },
  'Finance': {
    bg: '#D4A03D',
    bgLight: '#FEF3C7',
    bgUltraLight: '#FFFBEB',
    text: '#78350F',
    border: '#FDE68A',
    gradient: 'from-[#FEF3C7] to-[#FFFBEB]',
    accent: '#D4A03D',
  },
  'Lifestyle': {
    bg: '#9333EA',
    bgLight: '#F3E8FF',
    bgUltraLight: '#FAF5FF',
    text: '#581C87',
    border: '#E9D5FF',
    gradient: 'from-[#F3E8FF] to-[#FAF5FF]',
    accent: '#9333EA',
  },
  'Wellness': {
    bg: '#0891B2',
    bgLight: '#CFFAFE',
    bgUltraLight: '#ECFEFF',
    text: '#164E63',
    border: '#A5F3FC',
    gradient: 'from-[#CFFAFE] to-[#ECFEFF]',
    accent: '#0891B2',
  },
  'Business': {
    bg: '#1E40AF',
    bgLight: '#DBEAFE',
    bgUltraLight: '#EFF6FF',
    text: '#1E3A5F',
    border: '#BFDBFE',
    gradient: 'from-[#DBEAFE] to-[#EFF6FF]',
    accent: '#1E40AF',
  },
  'Productivity': {
    bg: '#EA580C',
    bgLight: '#FFEDD5',
    bgUltraLight: '#FFF7ED',
    text: '#7C2D12',
    border: '#FED7AA',
    gradient: 'from-[#FFEDD5] to-[#FFF7ED]',
    accent: '#EA580C',
  },
  'Mindset': {
    bg: '#DB2777',
    bgLight: '#FCE7F3',
    bgUltraLight: '#FDF2F8',
    text: '#831843',
    border: '#FBCFE8',
    gradient: 'from-[#FCE7F3] to-[#FDF2F8]',
    accent: '#DB2777',
  },
};

const CATEGORIES = Object.keys(CATEGORY_COLORS);

export function Shop() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState('default');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS['All'];

  useEffect(() => {
    getAllRecipes().then(setRecipes).finally(() => setLoading(false));
  }, []);

  const filteredRecipes = recipes.filter(
    (r) =>
      r.isOnline &&
      (category === 'All' || r.category.toLowerCase().includes(category.toLowerCase())) &&
      (r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
    <div
      className="min-h-screen py-10 md:py-16 transition-colors duration-700 ease-in-out"
      style={{ backgroundColor: colors.bgUltraLight }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        {/* Header */}
        <header className="mb-8 md:mb-12">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl lg:text-5xl font-serif italic mb-4 transition-colors duration-700"
            style={{ color: colors.text }}
          >
            {category === 'All' ? 'All Products' : `${category} Guides`}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-sm md:text-base transition-colors duration-700"
            style={{ color: colors.text, opacity: 0.7 }}
          >
            {category === 'All'
              ? 'Discover our handpicked guides for your daily life.'
              : `Expert-curated ${category.toLowerCase()} guides to level up your life.`}
          </motion.p>
        </header>

        {/* Filter & Controls Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col gap-6 mb-8 pb-6 transition-colors duration-700"
          style={{ borderBottomColor: colors.border, borderBottomWidth: '1px' }}
        >
          {/* Search Row */}
          <div className="relative w-full max-w-2xl">
            <SearchIcon
              className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-700"
              size={18}
              style={{ color: colors.text, opacity: 0.5 }}
            />
            <input
              type="text"
              placeholder={`Find your ${category === 'All' ? 'guide' : category.toLowerCase()} guide...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 transition-all duration-700 font-sans"
              style={{
                backgroundColor: '#FFFFFF',
                border: `1px solid ${colors.border}`,
                color: colors.text,
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 px-2 text-xs font-bold uppercase tracking-widest transition-colors duration-700"
                style={{ color: colors.text, opacity: 0.6 }}
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-start lg:items-center justify-between">
            {/* Category Pills */}
            <div className="flex flex-wrap gap-2 items-center w-full lg:w-auto">
              <div className="flex items-center gap-2 mr-2 transition-colors duration-700" style={{ color: colors.text, opacity: 0.6 }}>
                <SlidersHorizontal size={14} />
              </div>
              {CATEGORIES.map((cat) => {
                const catColors = CATEGORY_COLORS[cat];
                const isActive = category === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className="px-4 sm:px-5 py-2.5 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-500 btn-press"
                    style={
                      isActive
                        ? {
                            backgroundColor: catColors.bg,
                            color: '#FFFFFF',
                            boxShadow: `0 4px 14px ${catColors.bg}40`,
                          }
                        : {
                            backgroundColor: '#FFFFFF',
                            color: colors.text,
                            border: `1px solid ${colors.border}`,
                            opacity: 0.8,
                          }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = catColors.bgLight;
                        e.currentTarget.style.borderColor = catColors.border;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                        e.currentTarget.style.borderColor = colors.border;
                      }
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Right Side Controls */}
            <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
              {/* Product Count */}
              <span className="text-xs transition-colors duration-700" style={{ color: colors.text, opacity: 0.6 }}>
                {sortedRecipes.length}{' '}
                {sortedRecipes.length === 1 ? 'Product' : 'Products'}
              </span>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2">
                <ArrowUpDown size={14} className="transition-colors duration-700" style={{ color: colors.text, opacity: 0.5 }} />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 cursor-pointer transition-all duration-700"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                >
                  <option value="default">Default</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="name">Name A-Z</option>
                </select>
              </div>

              {/* View Mode Toggle (Desktop only) */}
              <div className="hidden md:flex items-center gap-1 rounded-xl p-1 transition-colors duration-700" style={{ backgroundColor: '#FFFFFF', border: `1px solid ${colors.border}` }}>
                <button
                  onClick={() => setViewMode('grid')}
                  className="p-2 rounded-lg transition-all duration-500"
                  style={
                    viewMode === 'grid'
                      ? { backgroundColor: colors.bg, color: '#FFFFFF' }
                      : { color: colors.text, opacity: 0.6 }
                  }
                  title="Grid view"
                >
                  <Grid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className="p-2 rounded-lg transition-all duration-500"
                  style={
                    viewMode === 'list'
                      ? { backgroundColor: colors.bg, color: '#FFFFFF' }
                      : { color: colors.text, opacity: 0.6 }
                  }
                  title="List view"
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
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="aspect-square rounded-2xl animate-pulse transition-colors duration-700"
                style={{ backgroundColor: colors.bgLight }}
              />
            ))}
          </div>
        ) : sortedRecipes.length > 0 ? (
          <div
            className={`grid gap-4 md:gap-6 ${
              viewMode === 'grid'
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                : 'grid-cols-1'
            }`}
          >
            {sortedRecipes.map((recipe, index) => (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <RecipeCard recipe={recipe} categoryColor={CATEGORY_COLORS[recipe.category] || CATEGORY_COLORS['All']} />
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 md:py-24 rounded-2xl md:rounded-[2rem] border transition-colors duration-700"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: colors.border,
            }}
          >
            <SearchIcon size={48} className="mx-auto mb-4 transition-colors duration-700" strokeWidth={1.5} style={{ color: colors.border }} />
            <h2 className="text-xl md:text-2xl font-serif italic mb-2 transition-colors duration-700" style={{ color: colors.text }}>
              No products found
            </h2>
            <p className="text-sm mb-6 transition-colors duration-700" style={{ color: colors.text, opacity: 0.7 }}>
              Try adjusting your search or filters to find what you are looking for.
            </p>
            <button
              onClick={() => {
                setCategory('All');
                setSearchTerm('');
              }}
              className="btn-press inline-flex items-center gap-2 text-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-500 hover:opacity-90"
              style={{ backgroundColor: colors.accent }}
            >
              Show All Categories
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
