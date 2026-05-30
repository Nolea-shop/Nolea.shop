import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { CartProvider } from './context/CartContext';
import { CategoryProvider } from './context/CategoryContext';
import { Navigation, Footer } from './components/Layout';
import { CookieBanner } from './components/CookieBanner';
import { Home } from './pages/Home';
import { Shop } from './pages/Shop';
import { ProductDetail } from './pages/ProductDetail';
import { Cart } from './pages/Cart';
import { Admin } from './pages/Admin';
import { Success } from './pages/Success';
import { Impressum } from './pages/Impressum';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';
import { ChatAgent } from './components/ChatAgent';
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
        <CategoryProvider>
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
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                {/* Fallback */}
                <Route path="*" element={<Home />} />
              </Routes>
            </main>
            <Footer />
          </div>
          <Toaster position="bottom-right" />
          <CookieBanner />
          <ChatAgent />
        </CategoryProvider>
      </CartProvider>
    </BrowserRouter>
  );
}

export default App;
/* deploy-trigger-cache-buster-20260517-0450 */
