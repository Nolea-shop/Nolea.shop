     1|     1|import React, { useEffect, useState } from 'react';
     2|     2|import { useParams, useNavigate, Link } from 'react-router-dom';
     3|     3|import { motion } from 'motion/react';
     4|     4|import {
     5|     5|  ArrowLeft,
     6|     6|  ShoppingBasket,
     7|     7|  Check,
     8|     8|  Clock,
     9|     9|  FileText,
    10|    10|  Star,
    11|    11|  ShieldCheck,
    12|    12|  Download,
    13|    13|  Lock,
    14|    14|  Zap,
    15|    15|  Heart
    16|    16|} from 'lucide-react';
    17|    17|import { useCart } from '../context/CartContext';
    18|    18|import { getAllRecipes } from '../services/recipeService';
    19|    19|import { Recipe } from '../types';
    20|    20|import toast from 'react-hot-toast';
    21|    21|
    22|    22|export function ProductDetail() {
    23|    23|  const { id } = useParams<{ id: string }>();
    24|    24|  const navigate = useNavigate();
    25|    25|  const { addToCart, cart } = useCart();
    26|    26|  const [recipe, setRecipe] = useState<Recipe | null>(null);
    27|    27|  const [related, setRelated] = useState<Recipe[]>([]);
    28|    28|  const [loading, setLoading] = useState(true);
    29|    29|  const [imageLoaded, setImageLoaded] = useState(false);
    30|    30|
    31|    31|  const isInCart = cart.some((item) => item.id === id);
    32|    32|
    33|    33|  useEffect(() => {
    34|    34|    window.scrollTo(0, 0);
    35|    35|    setLoading(true);
    36|    36|    setImageLoaded(false);
    37|    37|
    38|    38|    getAllRecipes().then((recipes) => {
    39|    39|      const found = recipes.find((r) => r.id === id);
    40|    40|      if (found) {
    41|    41|        setRecipe(found);
    42|    42|
    43|    43|        // Pinterest: Track PageVisit
    44|    44|        if (typeof window !== 'undefined' && (window as any).pintrk) {
    45|    45|          (window as any).pintrk('track', 'pagevisit', {
    46|    46|            event_id: found.id,
    47|    47|            value: (found.price || 0) / 100,
    48|    48|            order_quantity: 1,
    49|    49|            currency: 'EUR',
    50|    50|            property: found.category,
    51|    51|            line_items: [{
    52|    52|              product_name: found.title,
    53|    53|              product_id: found.id,
    54|    54|              product_category: found.category || 'Digital Guide',
    55|    55|              product_price: (found.price || 0) / 100,
    56|    56|              product_quantity: 1,
    57|    57|              product_brand: 'Nolea',
    58|    58|            }],
    59|    59|          });
    60|    60|        }
    61|    61|
    62|    62|        // Get related products (same category, excluding current)
    63|    63|        const relatedProducts = recipes
    64|    64|          .filter(
    65|    65|            (r) =>
    66|    66|              r.id !== id &&
    67|    67|              r.isOnline &&
    68|    68|              (r.category === found.category || r.category === 'Lifestyle')
    69|    69|          )
    70|    70|          .slice(0, 3);
    71|    71|        setRelated(relatedProducts);
    72|    72|      }
    73|    73|      setLoading(false);
    74|    74|    });
    75|    75|  }, [id]);
    76|    76|
    77|    77|  const handleAddToCart = () => {
    78|    78|    if (!recipe) return;
    79|    79|    if (isInCart) {
    80|    80|      navigate('/cart');
    81|    81|      return;
    82|    82|    }
    83|    83|    addToCart(recipe);
    84|    84|    toast.success(`${recipe.title} added to cart!`, {
    85|    85|      duration: 3000,
    86|    86|      icon: (
    87|    87|        <svg
    88|    88|          className="w-5 h-5 text-[#7A8F4E]"
    89|    89|          viewBox="0 0 24 24"
    90|    90|          fill="none"
    91|    91|          stroke="currentColor"
    92|    92|          strokeWidth="2"
    93|    93|          strokeLinecap="round"
    94|    94|          strokeLinejoin="round"
    95|    95|        >
    96|    96|          <circle cx="8" cy="21" r="1" />
    97|    97|          <circle cx="19" cy="21" r="1" />
    98|    98|          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    99|    99|        </svg>
   100|   100|      ),
   101|   101|      style: {
   102|   102|        background: '#FAF9F6',
   103|   103|        color: '#1F1D1A',
   104|   104|        border: '1px solid #E5E2D9',
   105|   105|        borderRadius: '1rem',
   106|   106|        padding: '12px 20px',
   107|   107|        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
   108|   108|      },
   109|   109|    });
   110|   110|  };
   111|   111|
   112|   112|  if (loading) {
   113|   113|    return (
   114|   114|      <div className="bg-[#FAF9F6] min-h-screen flex items-center justify-center">
   115|   115|        <div className="w-10 h-10 border-4 border-[#7A8F4E] border-t-transparent rounded-full animate-spin" />
   116|   116|      </div>
   117|   117|    );
   118|   118|  }
   119|   119|
   120|   120|  if (!recipe) {
   121|   121|    return (
   122|   122|      <div className="bg-[#FAF9F6] min-h-screen flex flex-col items-center justify-center p-6 text-center">
   123|   123|        <h2 className="text-2xl font-serif italic text-[#1F1D1A] mb-4">
   124|   124|          Product Not Found
   125|   125|        </h2>
   126|   126|        <p className="text-[#5C5748] mb-6">
   127|   127|          The product you are looking for does not exist or has been removed.
   128|   128|        </p>
   129|   129|        <Link
   130|   130|          to="/shop"
   131|   131|          className="btn-press bg-[#7A8F4E] text-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-[#5C6F3A] transition-all"
   132|   132|        >
   133|   133|          Back to Shop
   134|   134|        </Link>
   135|   135|      </div>
   136|   136|    );
   137|   137|  }
   138|   138|
   139|   139|  const features = [
   140|   140|    { icon: FileText, label: 'PDF Guide', desc: 'Instant download' },
   141|   141|    { icon: Download, label: 'Lifetime Access', desc: 'Download anytime' },
   142|   142|    { icon: ShieldCheck, label: 'Secure Purchase', desc: 'SSL encrypted' },
   143|   143|    { icon: Zap, label: 'Instant Delivery', desc: 'No waiting time' },
   144|   144|  ];
   145|   145|
   146|   146|  return (
   147|   147|    <div className="bg-[#FAF9F6] min-h-screen">
   148|   148|      {/* Breadcrumb + Back */}
   149|   149|      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6 pb-4">
   150|   150|        <button
   151|   151|          onClick={() => navigate(-1)}
   152|   152|          className="inline-flex items-center gap-2 text-[#5C5748] hover:text-[#1F1D1A] text-xs font-bold uppercase tracking-widest transition-colors"
   153|   153|        >
   154|   154|          <ArrowLeft size={16} />
   155|   155|          Back
   156|   156|        </button>
   157|   157|      </div>
   158|   158|
   159|   159|      {/* Main Product Section */}
   160|   160|      <section className="max-w-7xl mx-auto px-4 md:px-6 pb-12">
   161|   161|        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
   162|   162|          {/* Left: Image */}
   163|   163|          <motion.div
   164|   164|            initial={{ opacity: 0, x: -20 }}
   165|   165|            animate={{ opacity: 1, x: 0 }}
   166|   166|            transition={{ duration: 0.5 }}
   167|   167|            className="relative aspect-square lg:aspect-[4/5] rounded-2xl md:rounded-[2rem] overflow-hidden bg-[#F2EFE9]"
   168|   168|          >
   169|   169|            {!imageLoaded && <div className="absolute inset-0 blur-placeholder" />}
   170|   170|            <img
   171|   171|              src={recipe.imageUrl}
   172|   172|              alt={recipe.title}
   173|   173|              className="w-full h-full object-cover"
   174|   174|              onLoad={() => setImageLoaded(true)}
   175|   175|              style={{ opacity: imageLoaded ? 1 : 0 }}
   176|   176|            />
   177|   177|            <div className="absolute top-4 left-4">
   178|   178|              <span className="liquid-glass text-[#5C5748] font-sans text-[10px] px-3 py-1.5 rounded-full uppercase tracking-wider font-bold">
   179|   179|                {recipe.category}
   180|   180|              </span>
   181|   181|            </div>
   182|   182|          </motion.div>
   183|   183|
   184|   184|          {/* Right: Info */}
   185|   185|          <motion.div
   186|   186|            initial={{ opacity: 0, x: 20 }}
   187|   187|            animate={{ opacity: 1, x: 0 }}
   188|   188|            transition={{ duration: 0.5, delay: 0.1 }}
   189|   189|            className="flex flex-col justify-center"
   190|   190|          >
   191|   191|            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#7A8F4E] mb-3">
   192|   192|              Digital Guide
   193|   193|            </span>
   194|   194|
   195|   195|            <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif italic text-[#1F1D1A] mb-4 leading-tight">
   196|   196|              {recipe.title}
   197|   197|            </h1>
   198|   198|
   199|   199|            <div className="flex items-center gap-2 mb-6">
   200|   200|              <div className="flex items-center gap-0.5">
   201|   201|                {[1, 2, 3, 4, 5].map((star) => (
   202|   202|                  <Star
   203|   203|                    key={star}
   204|   204|                    size={14}
   205|   205|                    className="text-[#D4A03D] fill-[#D4A03D]"
   206|   206|                  />
   207|   207|                ))}
   208|   208|              </div>
   209|   209|              <span className="text-xs text-[#5C5748]">4.9 (128 reviews)</span>
   210|   210|            </div>
   211|   211|
   212|   212|            <p className="text-[#5C5748] text-sm md:text-base leading-relaxed mb-8">
   213|   213|              {recipe.description}
   214|   214|            </p>
   215|   215|
   216|   216|            {/* Price */}
   217|   217|            <div className="flex items-baseline gap-3 mb-8">
   218|   218|              <span className="text-4xl md:text-5xl font-bold text-[#1F1D1A]">
   219|   219|                {(recipe.price / 100).toFixed(2)}€
   220|   220|              </span>
   221|   221|              <span className="text-sm text-[#5C5748]">one-time purchase</span>
   222|   222|            </div>
   223|   223|
   224|   224|            {/* CTA Buttons */}
   225|   225|            <div className="flex flex-col sm:flex-row gap-3 mb-8">
   226|   226|              <motion.button
   227|   227|                onClick={handleAddToCart}
   228|   228|                whileTap={{ scale: 0.97 }}
   229|   229|                className={`btn-press flex-1 flex items-center justify-center gap-3 px-8 py-4 rounded-full text-sm font-bold uppercase tracking-wider transition-all shadow-lg ${
   230|   230|                  isInCart
   231|   231|                    ? 'bg-[#7A8F4E] text-white hover:bg-[#5C6F3A]'
   232|   232|                    : 'bg-[#1F1D1A] text-white hover:bg-[#7A8F4E]'
   233|   233|                }`}
   234|   234|              >
   235|   235|                {isInCart ? (
   236|   236|                  <>
   237|   237|                    <Check size={18} />
   238|   238|                    In Cart — Go to Checkout
   239|   239|                  </>
   240|   240|                ) : (
   241|   241|                  <>
   242|   242|                    <ShoppingBasket size={18} />
   243|   243|                    Add to Cart
   244|   244|                  </>
   245|   245|                )}
   246|   246|              </motion.button>
   247|   247|              <Link
   248|   248|                to="/cart"
   249|   249|                className="btn-press flex items-center justify-center gap-2 px-6 py-4 rounded-full text-sm font-medium text-[#1F1D1A] bg-white border border-[#E5E2D9] hover:bg-[#F2EFE9] transition-all"
   250|   250|              >
   251|   251|                <Heart size={16} />
   252|   252|                Save for Later
   253|   253|              </Link>
   254|   254|            </div>
   255|   255|
   256|   256|            {/* Trust Badges */}
   257|   257|            <div className="grid grid-cols-2 gap-3">
   258|   258|              {features.map((feature) => (
   259|   259|                <div
   260|   260|                  key={feature.label}
   261|   261|                  className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#E5E2D9]"
   262|   262|                >
   263|   263|                  <feature.icon
   264|   264|                    size={18}
   265|   265|                    className="text-[#7A8F4E] flex-shrink-0"
   266|   266|                    strokeWidth={1.5}
   267|   267|                  />
   268|   268|                  <div>
   269|   269|                    <p className="text-xs font-bold text-[#1F1D1A]">
   270|   270|                      {feature.label}
   271|   271|                    </p>
   272|   272|                    <p className="text-[10px] text-[#5C5748]">{feature.desc}</p>
   273|   273|                  </div>
   274|   274|                </div>
   275|   275|              ))}
   276|   276|            </div>
   277|   277|          </motion.div>
   278|   278|        </div>
   279|   279|      </section>
   280|   280|
   281|   281|      {/* Product Description */}
   282|   282|      <section className="bg-white border-y border-[#E5E2D9] py-12 md:py-16">
   283|   283|        <div className="max-w-4xl mx-auto px-4 md:px-6">
   284|   284|          <h2 className="text-2xl md:text-3xl font-serif italic text-[#1F1D1A] mb-6">
   285|   285|            What you get
   286|   286|          </h2>
   287|   287|          <div className="space-y-4 text-[#5C5748] text-sm md:text-base leading-relaxed">
   288|   288|            <p>
   289|   289|              This comprehensive guide is designed to help you achieve real results. Inside,
   290|   290|              you will find step-by-step instructions, practical tips, and proven strategies
   291|   291|              curated by experts in the field.
   292|   292|            </p>
   293|   293|            <ul className="space-y-3 mt-4">
   294|   294|              {[
   295|   295|                'Detailed PDF guide with actionable insights',
   296|   296|                'Instant digital download — no shipping delays',
   297|   297|                'Lifetime access to all future updates',
   298|   298|                'Works on any device: phone, tablet, or computer',
   299|   299|                '30-day money-back guarantee',
   300|   300|              ].map((item, i) => (
   301|   301|                <li key={i} className="flex items-start gap-3">
   302|   302|                  <Check
   303|   303|                    size={18}
   304|   304|                    className="text-[#7A8F4E] mt-0.5 flex-shrink-0"
   305|   305|                  />
   306|   306|                  <span>{item}</span>
   307|   307|                </li>
   308|   308|              ))}
   309|   309|            </ul>
   310|   310|          </div>
   311|   311|        </div>
   312|   312|      </section>
   313|   313|
   314|   314|      {/* Related Products */}
   315|   315|      {related.length > 0 && (
   316|   316|        <section className="py-12 md:py-16 max-w-7xl mx-auto px-4 md:px-6">
   317|   317|          <h2 className="text-2xl md:text-3xl font-serif italic text-[#1F1D1A] mb-8">
   318|   318|            You might also like
   319|   319|          </h2>
   320|   320|          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
   321|   321|            {related.map((r, index) => (
   322|   322|              <motion.div
   323|   323|                key={r.id}
   324|   324|                initial={{ opacity: 0, y: 20 }}
   325|   325|                whileInView={{ opacity: 1, y: 0 }}
   326|   326|                viewport={{ once: true }}
   327|   327|                transition={{ delay: index * 0.1 }}
   328|   328|                onClick={() => navigate(`/product/${r.id}`)}
   329|   329|                className="bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-[#E5E2D9] group cursor-pointer card-lift overflow-hidden"
   330|   330|              >
   331|   331|                <div className="relative aspect-square mb-3 rounded-xl overflow-hidden bg-[#F2EFE9]">
   332|   332|                  <img
   333|   333|                    src={r.imageUrl}
   334|   334|                    alt={r.title}
   335|   335|                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
   336|   336|                    loading="lazy"
   337|   337|                  />
   338|   338|                  <div className="absolute top-2 left-2">
   339|   339|                    <span className="liquid-glass text-[#5C5748] text-[9px] px-2 py-1 rounded-full uppercase tracking-wider font-bold">
   340|   340|                      {r.category}
   341|   341|                    </span>
   342|   342|                  </div>
   343|   343|                </div>
   344|   344|                <h3 className="font-serif italic text-base text-[#1F1D1A] line-clamp-1 group-hover:text-[#7A8F4E] transition-colors">
   345|   345|                  {r.title}
   346|   346|                </h3>
   347|   347|                <p className="text-xs text-[#5C5748] line-clamp-1 mt-1">
   348|   348|                  {r.description}
   349|   349|                </p>
   350|   350|                <p className="font-bold text-lg text-[#1F1D1A] mt-2">
   351|   351|                  {(r.price / 100).toFixed(2)}€
   352|   352|                </p>
   353|   353|              </motion.div>
   354|   354|            ))}
   355|   355|          </div>
   356|   356|        </section>
   357|   357|      )}
   358|   358|    </div>
   359|   359|  );
   360|   360|}
   361|   361|