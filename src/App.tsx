import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { CartProvider } from './context/CartContext';
import { Navigation, Footer } from './components/Layout';
import { CookieBanner } from './components/CookieBanner';
import { Home } from './pages/Home';
import { Shop } from './pages/Shop';
import { ProductDetail } from './pages/ProductDetail';
import { Cart } from './pages/Cart';
import { Admin } from './pages/Admin';
import { Success } from './pages/Success';
import { Impressum } from './pages/Impressum';
import { testConnection } from './lib/firebase';
import { useUserSync } from './hooks/useUserSync';

function App() {
  useUserSync();
  useEffect(() => {
    testConnection();
  }, []);

  return (
    <BrowserRouter>
      <CartProvider>
        <div className="flex flex-col min-h-screen">
          <Navigation />
          <main className="flex-grow pb-20 md:pb-0">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/success" element={<Success />} />
              <Route path="/impressum" element={<Impressum />} />
              {/* Fallback */}
              <Route path="*" element={<Home />} />
            </Routes>
          </main>
          <Footer />
        </div>
        <Toaster position="bottom-right" />
        <CookieBanner />
      </CartProvider>
    </BrowserRouter>
  );
}

export default App;
/* deploy-trigger-cache-buster-20260517-0450 */
