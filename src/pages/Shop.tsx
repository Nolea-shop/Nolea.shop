import React, { useEffect, useState } from 'react';
import { RecipeCard } from '../components/RecipeCard';
import { getAllRecipes } from '../services/recipeService';
import { Recipe } from '../types';
import { Filter } from 'lucide-react';

export function Shop() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('Alle');

  const categories = ['Alle', 'Pasta', 'Vegan', 'Brunch', 'Dessert', 'Quick'];

  useEffect(() => {
    getAllRecipes().then(setRecipes).finally(() => setLoading(false));
  }, []);

  const filteredRecipes = category === 'Alle' 
    ? recipes 
    : recipes.filter(r => r.category.toLowerCase().includes(category.toLowerCase()));

  return (
    <div className="bg-[#FAF9F6] min-h-screen py-16">
      <div className="max-w-7xl mx-auto px-6">
        <header className="mb-16">
          <h1 className="text-5xl font-serif italic text-[#2D2A26] mb-6">Alle Rezepte</h1>
          
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2 text-[#6B6658] mr-4 uppercase tracking-[0.2em] text-[10px] font-bold">
              <Filter size={14} />
              Filter:
            </div>
            {categories.map(cat => (
              <button 
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                  category === cat 
                    ? 'bg-[#8A9A5B] text-white shadow-sm' 
                    : 'bg-white text-[#6B6658] hover:bg-[#F2EFE9] border border-[#E5E2D9]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="aspect-square bg-[#F2EFE9] animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : filteredRecipes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-white rounded-[2.5rem] border border-[#E5E2D9]">
            <p className="text-[#6B6658] font-serif italic text-xl">
              Keine Rezepte in dieser Kategorie gefunden.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
