import React, { createContext, useContext, useState, useEffect } from 'react';
import { Recipe, CartItem } from '../types';

interface CartContextType {
  cart: CartItem[];
  addToCart: (recipe: Recipe) => void;
  removeFromCart: (recipeId: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('herzstueck-cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('herzstueck-cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (recipe: Recipe) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === recipe.id);
      if (existing) return prev; // Recipes are usually single purchase

      // Pinterest: Track AddToCart
      if (typeof window !== 'undefined' && (window as any).pintrk) {
        (window as any).pintrk('track', 'addtocart', {
          event_id: recipe.id,
          value: (recipe.price || 0) / 100,
          order_quantity: 1,
          currency: 'EUR',
        });
      }

      return [...prev, { ...recipe, quantity: 1 }];
    });
  };

  const removeFromCart = (recipeId: string) => {
    setCart(prev => prev.filter(item => item.id !== recipeId));
  };

  const clearCart = () => setCart([]);

  const totalItems = cart.length;
  const totalPrice = cart.reduce((sum, item) => sum + item.price, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
