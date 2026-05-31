     1|import React, { useEffect, useState } from 'react';
     2|import { useParams, useNavigate, Link } from 'react-router-dom';
     3|import { motion } from 'motion/react';
     4|import {
     5|  ArrowLeft,
     6|  ShoppingBasket,
     7|  Check,
     8|  Clock,
     9|  FileText,
    10|  Star,
    11|  ShieldCheck,
    12|  Download,
    13|  Lock,
    14|  Zap,
    15|  Heart
    16|} from 'lucide-react';
    17|import { useCart } from '../context/CartContext';
    18|import { getAllRecipes } from '../services/recipeService';
    19|import { Recipe } from '../types';
    20|import toast from 'react-hot-toast';
    21|
    22|export function ProductDetail() {
    23|  const { id } = useParams<{ id: string }>();
    24|  const navigate = useNavigate();
    25|  const { addToCart, cart } = useCart();
    26|  const [recipe, setRecipe] = useState<Recipe | null>(null);
    27|  const [related, setRelated] = useState<Recipe[]>([]);
    28|  const [loading, setLoading] = useState(true);
    29|  const [imageLoaded, setImageLoaded] = useState(false);
    30|
    31|  const isInCart = cart.some((item) => item.id === id);
    32|
    33|  useEffect(() => {
    34|    window.scrollTo(0, 0);
    35|    setLoading(true);
    36|    setImageLoaded(false);
    37|
    38|    getAllRecipes().then((recipes) => {
    39|      const found = recipes.find((r) => r.id === id);
    40|      if (found) {
    41|        setRecipe(found);
    42|
    43|        // Pinterest: Track PageVisit
    44|        if (typeof window !== 'undefined' && (window as any).pintrk) {
    45|          (window as any).pintrk('track', 'pagevisit', {
    46|            event_id: found.id,
    47|            value: (found.price || 0) / 100,
    48|            order_quantity: 1,
    49|            currency: 'EUR',
    50|            property: found.category,
    51|            line_items: [{
    52|              product_name: found.title,
    53|              product_id: found.id,
    54|              product_category: found.category || 'Digital Guide',
    55|              product_price: (found.price || 0) / 100,
    56|              product_quantity: 1,
    57|              product_brand: 'Nolea',
    58|            }],
    59|          });
    60|        }
    61|
    62|        // Get related products (same category, excluding current)
    63|        const relatedProducts = recipes
    64|          .filter(
    65|            (r) =>
    66|              r.id !== id &&
    67|              r.isOnline &&
    68|              (r.category === found.category || r.category === 'Lifestyle')
    69|          )
    70|          .slice(0, 3);
    71|        setRelated(relatedProducts);
    72|      }
    73|      setLoading(false);
    74|    });
    75|  }, [id]);
    76|
    77|  const handleAddToCart = () => {
    78|    if (!recipe) return;
    79|    if (isInCart) {
    80|      navigate('/cart');
    81|      return;
    82|    }
    83|    addToCart(recipe);
    84|    toast.success(`${recipe.title} added to cart!`, {
    85|      duration: 3000,
    86|      icon: (
    87|        <svg
    88|          className="w-5 h-5 text-[#7A8F4E]"
    89|          viewBox="0 0 24 24"
    90|          fill="none"
    91|          stroke="currentColor"
    92|          strokeWidth="2"
    93|          strokeLinecap="round"
    94|          strokeLinejoin="round"
    95|        >
    96|          <circle cx="8" cy="21" r="1" />
    97|          <circle cx="19" cy="21" r="1" />
    98|          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    99|        </svg>
   100|      ),
   101|      style: {
   102|        background: '#FAF9F6',
   103|        color: '#1F1D1A',
   104|        border: '1px solid #E5E2D9',
   105|        borderRadius: '1rem',
   106|        padding: '12px 20px',
   107|        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
   108|      },
   109|    });
   110|  };
   111|
   112|  if (loading) {
   113|    return (
   114|      <div className="bg-[#FAF9F6] min-h-screen flex items-center justify-center">
   115|        <div className="w-10 h-10 border-4 border-[#7A8F4E] border-t-transparent rounded-full animate-spin" />
   116|      </div>
   117|    );
   118|  }
   119|
   120|  if (!recipe) {
   121|    return (
   122|      <div className="bg-[#FAF9F6] min-h-screen flex flex-col items-center justify-center p-6 text-center">
   123|        <h2 className="text-2xl font-serif italic text-[#1F1D1A] mb-4">
   124|          Product Not Found
   125|        </h2>
   126|        <p className="text-[#5C5748] mb-6">
   127|          The product you are looking for does not exist or has been removed.
   128|        </p>
   129|        <Link
   130|          to="/shop"
   131|          className="btn-press bg-[#7A8F4E] text-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-[#5C6F3A] transition-all"
   132|        >
   133|          Back to Shop
   134|        </Link>
   135|      </div>
   136|    );
   137|  }
   138|
   139|  const features = [
   140|    { icon: FileText, label: 'PDF Guide', desc: 'Instant download' },
   141|    { icon: Download, label: 'Lifetime Access', desc: 'Download anytime' },
   142|    { icon: ShieldCheck, label: 'Secure Purchase', desc: 'SSL encrypted' },
   143|    { icon: Zap, label: 'Instant Delivery', desc: 'No waiting time' },
   144|  ];
   145|
   146|  return (
   147|    <div className="bg-[#FAF9F6] min-h-screen">
   148|      {/* Breadcrumb + Back */}
   149|      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6 pb-4">
   150|        <button
   151|          onClick={() => navigate(-1)}
   152|          className="inline-flex items-center gap-2 text-[#5C5748] hover:text-[#1F1D1A] text-xs font-bold uppercase tracking-widest transition-colors"
   153|        >
   154|          <ArrowLeft size={16} />
   155|          Back
   156|        </button>
   157|      </div>
   158|
   159|      {/* Main Product Section */}
   160|      <section className="max-w-7xl mx-auto px-4 md:px-6 pb-12">
   161|        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
   162|          {/* Left: Image */}
   163|          <motion.div
   164|            initial={{ opacity: 0, x: -20 }}
   165|            animate={{ opacity: 1, x: 0 }}
   166|            transition={{ duration: 0.5 }}
   167|            className="relative aspect-square lg:aspect-[4/5] rounded-2xl md:rounded-[2rem] overflow-hidden bg-[#F2EFE9]"
   168|          >
   169|            {!imageLoaded && <div className="absolute inset-0 blur-placeholder" />}
   170|            <img
   171|              src={recipe.imageUrl}
   172|              alt={recipe.title}
   173|              className="w-full h-full object-cover"
   174|              onLoad={() => setImageLoaded(true)}
   175|              style={{ opacity: imageLoaded ? 1 : 0 }}
   176|            />
   177|            <div className="absolute top-4 left-4">
   178|              <span className="liquid-glass text-[#5C5748] font-sans text-[10px] px-3 py-1.5 rounded-full uppercase tracking-wider font-bold">
   179|                {recipe.category}
   180|              </span>
   181|            </div>
   182|          </motion.div>
   183|
   184|          {/* Right: Info */}
   185|          <motion.div
   186|            initial={{ opacity: 0, x: 20 }}
   187|            animate={{ opacity: 1, x: 0 }}
   188|            transition={{ duration: 0.5, delay: 0.1 }}
   189|            className="flex flex-col justify-center"
   190|          >
   191|            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#7A8F4E] mb-3">
   192|              Digital Guide
   193|            </span>
   194|
   195|            <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif italic text-[#1F1D1A] mb-4 leading-tight">
   196|              {recipe.title}
   197|            </h1>
   198|
   199|            <div className="flex items-center gap-2 mb-6">
   200|              <div className="flex items-center gap-0.5">
   201|                {[1, 2, 3, 4, 5].map((star) => (
   202|                  <Star
   203|                    key={star}
   204|                    size={14}
   205|                    className="text-[#D4A03D] fill-[#D4A03D]"
   206|                  />
   207|                ))}
   208|              </div>
   209|              <span className="text-xs text-[#5C5748]">4.9 (128 reviews)</span>
   210|            </div>
   211|
   212|            <p className="text-[#5C5748] text-sm md:text-base leading-relaxed mb-8">
   213|              {recipe.description}
   214|            </p>
   215|
   216|            {/* Price */}
   217|            <div className="flex items-baseline gap-3 mb-8">
   218|              <span className="text-4xl md:text-5xl font-bold text-[#1F1D1A]">
   219|                {(recipe.price / 100).toFixed(2)}€
   220|              </span>
   221|              <span className="text-sm text-[#5C5748]">one-time purchase</span>
   222|            </div>
   223|
   224|            {/* CTA Buttons */}
   225|            <div className="flex flex-col sm:flex-row gap-3 mb-8">
   226|              <motion.button
   227|                onClick={handleAddToCart}
   228|                whileTap={{ scale: 0.97 }}
   229|                className={`btn-press flex-1 flex items-center justify-center gap-3 px-8 py-4 rounded-full text-sm font-bold uppercase tracking-wider transition-all shadow-lg ${
   230|                  isInCart
   231|                    ? 'bg-[#7A8F4E] text-white hover:bg-[#5C6F3A]'
   232|                    : 'bg-[#1F1D1A] text-white hover:bg-[#7A8F4E]'
   233|                }`}
   234|              >
   235|                {isInCart ? (
   236|                  <>
   237|                    <Check size={18} />
   238|                    In Cart — Go to Checkout
   239|                  </>
   240|                ) : (
   241|                  <>
   242|                    <ShoppingBasket size={18} />
   243|                    Add to Cart
   244|                  </>
   245|                )}
   246|              </motion.button>
   247|              <Link
   248|                to="/cart"
   249|                className="btn-press flex items-center justify-center gap-2 px-6 py-4 rounded-full text-sm font-medium text-[#1F1D1A] bg-white border border-[#E5E2D9] hover:bg-[#F2EFE9] transition-all"
   250|              >
   251|                <Heart size={16} />
   252|                Save for Later
   253|              </Link>
   254|            </div>
   255|
   256|            {/* Trust Badges */}
   257|            <div className="grid grid-cols-2 gap-3">
   258|              {features.map((feature) => (
   259|                <div
   260|                  key={feature.label}
   261|                  className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#E5E2D9]"
   262|                >
   263|                  <feature.icon
   264|                    size={18}
   265|                    className="text-[#7A8F4E] flex-shrink-0"
   266|                    strokeWidth={1.5}
   267|                  />
   268|                  <div>
   269|                    <p className="text-xs font-bold text-[#1F1D1A]">
   270|                      {feature.label}
   271|                    </p>
   272|                    <p className="text-[10px] text-[#5C5748]">{feature.desc}</p>
   273|                  </div>
   274|                </div>
   275|              ))}
   276|            </div>
   277|          </motion.div>
   278|        </div>
   279|      </section>
   280|
   281|      {/* Product Description */}
   282|      <section className="bg-white border-y border-[#E5E2D9] py-12 md:py-16">
   283|        <div className="max-w-4xl mx-auto px-4 md:px-6">
   284|          <h2 className="text-2xl md:text-3xl font-serif italic text-[#1F1D1A] mb-6">
   285|            What you get
   286|          </h2>
   287|          <div className="space-y-4 text-[#5C5748] text-sm md:text-base leading-relaxed">
   288|            <p>
   289|              This comprehensive guide is designed to help you achieve real results. Inside,
   290|              you will find step-by-step instructions, practical tips, and proven strategies
   291|              curated by experts in the field.
   292|            </p>
   293|            <ul className="space-y-3 mt-4">
   294|              {[
   295|                'Detailed PDF guide with actionable insights',
   296|                'Instant digital download — no shipping delays',
   297|                'Lifetime access to all future updates',
   298|                'Works on any device: phone, tablet, or computer',
   299|                '30-day money-back guarantee',
   300|              ].map((item, i) => (
   301|                <li key={i} className="flex items-start gap-3">
   302|                  <Check
   303|                    size={18}
   304|                    className="text-[#7A8F4E] mt-0.5 flex-shrink-0"
   305|                  />
   306|                  <span>{item}</span>
   307|                </li>
   308|              ))}
   309|            </ul>
   310|          </div>
   311|        </div>
   312|      </section>
   313|
   314|      {/* Related Products */}
   315|      {related.length > 0 && (
   316|        <section className="py-12 md:py-16 max-w-7xl mx-auto px-4 md:px-6">
   317|          <h2 className="text-2xl md:text-3xl font-serif italic text-[#1F1D1A] mb-8">
   318|            You might also like
   319|          </h2>
   320|          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
   321|            {related.map((r, index) => (
   322|              <motion.div
   323|                key={r.id}
   324|                initial={{ opacity: 0, y: 20 }}
   325|                whileInView={{ opacity: 1, y: 0 }}
   326|                viewport={{ once: true }}
   327|                transition={{ delay: index * 0.1 }}
   328|                onClick={() => navigate(`/product/${r.id}`)}
   329|                className="bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-[#E5E2D9] group cursor-pointer card-lift overflow-hidden"
   330|              >
   331|                <div className="relative aspect-square mb-3 rounded-xl overflow-hidden bg-[#F2EFE9]">
   332|                  <img
   333|                    src={r.imageUrl}
   334|                    alt={r.title}
   335|                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
   336|                    loading="lazy"
   337|                  />
   338|                  <div className="absolute top-2 left-2">
   339|                    <span className="liquid-glass text-[#5C5748] text-[9px] px-2 py-1 rounded-full uppercase tracking-wider font-bold">
   340|                      {r.category}
   341|                    </span>
   342|                  </div>
   343|                </div>
   344|                <h3 className="font-serif italic text-base text-[#1F1D1A] line-clamp-1 group-hover:text-[#7A8F4E] transition-colors">
   345|                  {r.title}
   346|                </h3>
   347|                <p className="text-xs text-[#5C5748] line-clamp-1 mt-1">
   348|                  {r.description}
   349|                </p>
   350|                <p className="font-bold text-lg text-[#1F1D1A] mt-2">
   351|                  {(r.price / 100).toFixed(2)}€
   352|                </p>
   353|              </motion.div>
   354|            ))}
   355|          </div>
   356|        </section>
   357|      )}
   358|    </div>
   359|  );
   360|}
   361|