import React, { createContext, useContext, useState } from 'react';

export interface CategoryColors {
  bg: string;           // Button / solid accent
  bgLight: string;      // Light background
  bgUltraLight: string; // Page background
  text: string;         // Main text
  border: string;       // Borders
  accent: string;       // Badge, links
}

export const DEFAULT_COLORS: CategoryColors = {
  bg: '#1F1D1A',
  bgLight: '#F2EFE9',
  bgUltraLight: '#FAF9F6',
  text: '#1F1D1A',
  border: '#E5E2D9',
  accent: '#7A8F4E',
};

interface CategoryContextType {
  activeCategory: string;
  colors: CategoryColors;
  setActiveCategory: (category: string, colors: CategoryColors) => void;
}

const CategoryContext = createContext<CategoryContextType>({
  activeCategory: 'All',
  colors: DEFAULT_COLORS,
  setActiveCategory: () => {},
});

export function CategoryProvider({ children }: { children: React.ReactNode }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [colors, setColors] = useState<CategoryColors>(DEFAULT_COLORS);

  const handleSetCategory = (category: string, categoryColors: CategoryColors) => {
    setActiveCategory(category);
    setColors(categoryColors);
  };

  return (
    <CategoryContext.Provider
      value={{ activeCategory, colors, setActiveCategory: handleSetCategory }}
    >
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategory() {
  return useContext(CategoryContext);
}
