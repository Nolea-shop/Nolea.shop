     1|import React, { createContext, useContext, useState, useEffect } from 'react';
     2|import { Recipe, CartItem } from '../types';
     3|
     4|interface CartContextType {
     5|  cart: CartItem[];
     6|  addToCart: (recipe: Recipe) => void;
     7|  removeFromCart: (recipeId: string) => void;
     8|  clearCart: () => void;
     9|  totalItems: number;
    10|  totalPrice: number;
    11|}
    12|
    13|const CartContext = createContext<CartContextType | undefined>(undefined);
    14|
    15|export function CartProvider({ children }: { children: React.ReactNode }) {
    16|  const [cart, setCart] = useState<CartItem[]>(() => {
    17|    const saved = localStorage.getItem('herzstueck-cart');
    18|    return saved ? JSON.parse(saved) : [];
    19|  });
    20|
    21|  useEffect(() => {
    22|    localStorage.setItem('herzstueck-cart', JSON.stringify(cart));
    23|  }, [cart]);
    24|
    25|  const addToCart = (recipe: Recipe) => {
    26|    setCart(prev => {
    27|      const existing = prev.find(item => item.id === recipe.id);
    28|      if (existing) return prev; // Recipes are usually single purchase
    29|
    30|      // Pinterest: Track AddToCart
    31|      if (typeof window !== 'undefined' && (window as any).pintrk) {
    32|        (window as any).pintrk('track', 'addtocart', {
    33|          event_id: recipe.id,
    34|          value: (recipe.price || 0) / 100,
    35|          order_quantity: 1,
    36|          currency: 'EUR',
    37|          line_items: [{
    38|            product_name: recipe.title,
    39|            product_id: recipe.id,
    40|            product_category: recipe.category || 'Digital Guide',
    41|            product_price: (recipe.price || 0) / 100,
    42|            product_quantity: 1,
    43|            product_brand: 'Nolea',
    44|          }],
    45|        });
    46|      }
    47|
    48|      return [...prev, { ...recipe, quantity: 1 }];
    49|    });
    50|  };
    51|
    52|  const removeFromCart = (recipeId: string) => {
    53|    setCart(prev => prev.filter(item => item.id !== recipeId));
    54|  };
    55|
    56|  const clearCart = () => setCart([]);
    57|
    58|  const totalItems = cart.length;
    59|  const totalPrice = cart.reduce((sum, item) => sum + item.price, 0);
    60|
    61|  return (
    62|    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, totalItems, totalPrice }}>
    63|      {children}
    64|    </CartContext.Provider>
    65|  );
    66|}
    67|
    68|export function useCart() {
    69|  const context = useContext(CartContext);
    70|  if (!context) throw new Error('useCart must be used within CartProvider');
    71|  return context;
    72|}
    73|