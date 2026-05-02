import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { CartProvider } from './context/CartContext';
import { Navigation, Footer } from './components/Layout';
import { Home } from './pages/Home';
import { Shop } from './pages/Shop';
import { Cart } from './pages/Cart';
import { Admin } from './pages/Admin';
import { Success } from './pages/Success';
import { Impressum } from './pages/Impressum';
import { testConnection } from './lib/firebase';

function App() {
  useEffect(() => {
    testConnection();
  }, []);

  return (
    <BrowserRouter>
      <CartProvider>
        <div className="flex flex-col min-h-screen">
          <Navigation />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/shop" element={<Shop />} />
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
      </CartProvider>
    </BrowserRouter>
  );
}

export default App;
