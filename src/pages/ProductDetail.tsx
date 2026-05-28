import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ShoppingBasket,
  Check,
  Clock,
  FileText,
  Star,
  ShieldCheck,
  Download,
  Lock,
  Zap,
  Heart
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { getAllRecipes } from '../services/recipeService';
import { Recipe } from '../types';
import toast from 'react-hot-toast';

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart, cart } = useCart();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [related, setRelated] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);

  const isInCart = cart.some((item) => item.id === id);

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    setImageLoaded(false);

    getAllRecipes().then((recipes) => {
      const found = recipes.find((r) => r.id === id);
      if (found) {
        setRecipe(found);
        // Get related products (same category, excluding current)
        const relatedProducts = recipes
          .filter(
            (r) =>
              r.id !== id &&
              r.isOnline &&
              (r.category === found.category || r.category === 'Lifestyle')
          )
          .slice(0, 3);
        setRelated(relatedProducts);
      }
      setLoading(false);
    });
  }, [id]);

  const handleAddToCart = () => {
    if (!recipe) return;
    if (isInCart) {
      navigate('/cart');
      return;
    }
    addToCart(recipe);
    toast.success(`${recipe.title} added to cart!`, {
      duration: 3000,
      icon: (
        <svg
          className="w-5 h-5 text-[#7A8F4E]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="8" cy="21" r="1" />
          <circle cx="19" cy="21" r="1" />
          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
        </svg>
      ),
      style: {
        background: '#FAF9F6',
        color: '#1F1D1A',
        border: '1px solid #E5E2D9',
        borderRadius: '1rem',
        padding: '12px 20px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      },
    });
  };

  if (loading) {
    return (
      <div className="bg-[#FAF9F6] min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#7A8F4E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="bg-[#FAF9F6] min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-serif italic text-[#1F1D1A] mb-4">
          Product Not Found
        </h2>
        <p className="text-[#5C5748] mb-6">
          The product you are looking for does not exist or has been removed.
        </p>
        <Link
          to="/shop"
          className="btn-press bg-[#7A8F4E] text-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-[#5C6F3A] transition-all"
        >
          Back to Shop
        </Link>
      </div>
    );
  }

  const features = [
    { icon: FileText, label: 'PDF Guide', desc: 'Instant download' },
    { icon: Download, label: 'Lifetime Access', desc: 'Download anytime' },
    { icon: ShieldCheck, label: 'Secure Purchase', desc: 'SSL encrypted' },
    { icon: Zap, label: 'Instant Delivery', desc: 'No waiting time' },
  ];

  return (
    <div className="bg-[#FAF9F6] min-h-screen">
      {/* Breadcrumb + Back */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-[#5C5748] hover:text-[#1F1D1A] text-xs font-bold uppercase tracking-widest transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>
      </div>

      {/* Main Product Section */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left: Image */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="relative aspect-square lg:aspect-[4/5] rounded-2xl md:rounded-[2rem] overflow-hidden bg-[#F2EFE9]"
          >
            {!imageLoaded && <div className="absolute inset-0 blur-placeholder" />}
            <img
              src={recipe.imageUrl}
              alt={recipe.title}
              className="w-full h-full object-cover"
              onLoad={() => setImageLoaded(true)}
              style={{ opacity: imageLoaded ? 1 : 0 }}
            />
            <div className="absolute top-4 left-4">
              <span className="liquid-glass text-[#5C5748] font-sans text-[10px] px-3 py-1.5 rounded-full uppercase tracking-wider font-bold">
                {recipe.category}
              </span>
            </div>
          </motion.div>

          {/* Right: Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col justify-center"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#7A8F4E] mb-3">
              Digital Guide
            </span>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif italic text-[#1F1D1A] mb-4 leading-tight">
              {recipe.title}
            </h1>

            <div className="flex items-center gap-2 mb-6">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={14}
                    className="text-[#D4A03D] fill-[#D4A03D]"
                  />
                ))}
              </div>
              <span className="text-xs text-[#5C5748]">4.9 (128 reviews)</span>
            </div>

            <p className="text-[#5C5748] text-sm md:text-base leading-relaxed mb-8">
              {recipe.description}
            </p>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-8">
              <span className="text-4xl md:text-5xl font-bold text-[#1F1D1A]">
                {(recipe.price / 100).toFixed(2)}€
              </span>
              <span className="text-sm text-[#5C5748]">one-time purchase</span>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <motion.button
                onClick={handleAddToCart}
                whileTap={{ scale: 0.97 }}
                className={`btn-press flex-1 flex items-center justify-center gap-3 px-8 py-4 rounded-full text-sm font-bold uppercase tracking-wider transition-all shadow-lg ${
                  isInCart
                    ? 'bg-[#7A8F4E] text-white hover:bg-[#5C6F3A]'
                    : 'bg-[#1F1D1A] text-white hover:bg-[#7A8F4E]'
                }`}
              >
                {isInCart ? (
                  <>
                    <Check size={18} />
                    In Cart — Go to Checkout
                  </>
                ) : (
                  <>
                    <ShoppingBasket size={18} />
                    Add to Cart
                  </>
                )}
              </motion.button>
              <Link
                to="/cart"
                className="btn-press flex items-center justify-center gap-2 px-6 py-4 rounded-full text-sm font-medium text-[#1F1D1A] bg-white border border-[#E5E2D9] hover:bg-[#F2EFE9] transition-all"
              >
                <Heart size={16} />
                Save for Later
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 gap-3">
              {features.map((feature) => (
                <div
                  key={feature.label}
                  className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#E5E2D9]"
                >
                  <feature.icon
                    size={18}
                    className="text-[#7A8F4E] flex-shrink-0"
                    strokeWidth={1.5}
                  />
                  <div>
                    <p className="text-xs font-bold text-[#1F1D1A]">
                      {feature.label}
                    </p>
                    <p className="text-[10px] text-[#5C5748]">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Product Description */}
      <section className="bg-white border-y border-[#E5E2D9] py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-serif italic text-[#1F1D1A] mb-6">
            What you get
          </h2>
          <div className="space-y-4 text-[#5C5748] text-sm md:text-base leading-relaxed">
            <p>
              This comprehensive guide is designed to help you achieve real results. Inside,
              you will find step-by-step instructions, practical tips, and proven strategies
              curated by experts in the field.
            </p>
            <ul className="space-y-3 mt-4">
              {[
                'Detailed PDF guide with actionable insights',
                'Instant digital download — no shipping delays',
                'Lifetime access to all future updates',
                'Works on any device: phone, tablet, or computer',
                '30-day money-back guarantee',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check
                    size={18}
                    className="text-[#7A8F4E] mt-0.5 flex-shrink-0"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="py-12 md:py-16 max-w-7xl mx-auto px-4 md:px-6">
          <h2 className="text-2xl md:text-3xl font-serif italic text-[#1F1D1A] mb-8">
            You might also like
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {related.map((r, index) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                onClick={() => navigate(`/product/${r.id}`)}
                className="bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-[#E5E2D9] group cursor-pointer card-lift overflow-hidden"
              >
                <div className="relative aspect-square mb-3 rounded-xl overflow-hidden bg-[#F2EFE9]">
                  <img
                    src={r.imageUrl}
                    alt={r.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute top-2 left-2">
                    <span className="liquid-glass text-[#5C5748] text-[9px] px-2 py-1 rounded-full uppercase tracking-wider font-bold">
                      {r.category}
                    </span>
                  </div>
                </div>
                <h3 className="font-serif italic text-base text-[#1F1D1A] line-clamp-1 group-hover:text-[#7A8F4E] transition-colors">
                  {r.title}
                </h3>
                <p className="text-xs text-[#5C5748] line-clamp-1 mt-1">
                  {r.description}
                </p>
                <p className="font-bold text-lg text-[#1F1D1A] mt-2">
                  {(r.price / 100).toFixed(2)}€
                </p>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
