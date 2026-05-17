import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { auth } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { getAllRecipes, createRecipe, deleteRecipe, updateRecipe, toggleRecipeOnline, getAdminRecipes, getCreatorRecipes } from '../services/recipeService';
import { getAllOrders, getUserOrders } from '../services/orderService';
import { Recipe } from '../types';
import { Plus, Trash2, LayoutDashboard, Utensils, ShoppingBag, LogOut, ShieldAlert, LogIn, Settings, CheckCircle2, XCircle, Edit3, Eye, EyeOff, X, ExternalLink, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export function Admin() {
  const [user, authLoading] = useAuthState(auth);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'recipes' | 'orders' | 'system'>('recipes');
  const [configStatus, setConfigStatus] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simEmail, setSimEmail] = useState(user?.email || '');
  const [simRecipe, setSimRecipe] = useState('');

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

  const [newRecipe, setNewRecipe] = useState({
    title: '',
    description: '',
    price: 0,
    imageUrl: '',
    category: 'Lifestyle',
    contentUrl: '',
    isOnline: true,
  });

  // Publishing progress states
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);
  const [publishStage, setPublishStage] = useState('');

  const isAdmin = user?.email === 'julianlegendstar@gmail.com';
  const isCreator = !!user;

  const loadData = async () => {
    if (!user) return;
    try {
      const isActualAdmin = user.email === 'julianlegendstar@gmail.com';
      const [r, o, config] = await Promise.all([
        isActualAdmin ? getAdminRecipes() : getCreatorRecipes(user.uid), 
        isActualAdmin ? getAllOrders() : getUserOrders(user.uid),
        fetch('/api/admin/config-status').then(res => res.json())
      ]);
      setRecipes(r);
      setOrders(o);
      setConfigStatus(config);
      if (r.length > 0) setSimRecipe(r[0].title);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  useEffect(() => {
    if (user) {
      loadData().finally(() => setLoading(false));
    }
  }, [user]);

  const handleSimulatePurchase = async () => {
    if (!simEmail) return toast.error('Bitte E-Mail angeben');
    
    setIsSimulating(true);
    try {
      const response = await fetch('/api/admin/simulate-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeTitles: simRecipe,
          customerEmail: simEmail,
          adminKey: 'SIMULATION_MODE' // Hardcoded client key is irrelevant, check should be in backend
        })
      });

      if (response.ok) {
        toast.success('Simulation erfolgreich! Email gesendet.');
      } else {
        const error = await response.json();
        toast.error(`Fehler: ${error.error}`);
      }
    } catch (error) {
      toast.error('Simulation fehlgeschlagen');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleAddRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPublishing(true);
    setPublishProgress(0);
    setPublishStage('Validierung...');

    try {
      // Schritt 1: Validierung (simuliert)
      await new Promise(resolve => setTimeout(resolve, 300));
      setPublishProgress(20);
      setPublishStage('Produkt wird erstellt...');

      // Schritt 2: Produkt erstellen
      await createRecipe({
        ...newRecipe,
        authorId: user.uid,
        authorEmail: user.email || '',
        isUserGenerated: true,
        isOnline: isAdmin ? newRecipe.isOnline : false // Creators start offline (draft)
      });
      setPublishProgress(60);
      setPublishStage('Assets werden verarbeitet...');

      // Schritt 3: Verarbeitung (simuliert)
      await new Promise(resolve => setTimeout(resolve, 400));
      setPublishProgress(80);
      setPublishStage('Finalisiere...');

      // Erfolg
      toast.success('Produkt hinzugefügt und veröffentlicht!', {
        icon: '✅',
        duration: 3000,
      });

      setNewRecipe({ title: '', description: '', price: 0, imageUrl: '', category: 'Lifestyle', contentUrl: '', isOnline: true });
      setPublishProgress(100);
      setPublishStage('Abgeschlossen');

      await loadData();
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Fortschritt zurücksetzen nach kurzer Verzögerung
      setTimeout(() => {
        setPublishProgress(0);
        setPublishStage('');
        setIsPublishing(false);
      }, 2000);

    } catch (error: any) {
      console.error('Save error details:', error);
      // Reset states immediately to avoid stuck UI
      setIsPublishing(false);
      setPublishProgress(0);
      setPublishStage('');
      
      const errorMessage = error?.message || String(error);
      toast.error(`Fehler: ${errorMessage.substring(0, 100)}`, { 
        duration: 6000,
        icon: '⚠'
      });
    }
  };

  const handleEditRecipe = (recipe: Recipe) => {
    setEditingRecipe({ ...recipe });
    setEditModalOpen(true);
  };

  const handleUpdateRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecipe) return;
    
    try {
      const { id, ...updateData } = editingRecipe;
      await updateRecipe(id, updateData);
      toast.success('Produkt aktualisiert!');
      setEditModalOpen(false);
      setEditingRecipe(null);
      await loadData();
    } catch (error: any) {
      toast.error(`Fehler beim Aktualisieren: ${error.message}`);
    }
  };

  const handleToggleOnline = async (recipe: Recipe) => {
    try {
      await toggleRecipeOnline(recipe.id, recipe.isOnline);
      toast.success(recipe.isOnline ? 'Produkt offline gestellt' : 'Produkt online geschaltet!');
      await loadData();
    } catch (error: any) {
      toast.error(`Fehler: ${error.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Produkt wirklich löschen?')) {
      await deleteRecipe(id);
      toast.success('Gelöscht');
      await loadData();
    }
  };

  // Stats for product overview
  const onlineCount = recipes.filter(r => r.isOnline).length;
  const offlineCount = recipes.filter(r => !r.isOnline).length;

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAF9F6] p-6">
        <div className="w-8 h-8 border-4 border-[#8A9A5B] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[#6B6658] font-serif italic">Prüfe Berechtigung...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAF9F6] p-6 text-center">
        <div className="w-16 h-16 bg-[#F2EFE9] text-[#2D2A26] rounded-full flex items-center justify-center mb-6">
          <ShieldAlert size={32} strokeWidth={1.5} />
        </div>
        <h1 className="text-3xl font-serif italic text-[#2D2A26] mb-4">Creator Hub</h1>
        <p className="text-[#6B6658] mb-8 max-w-sm text-sm">
          Logge dich ein, um deine eigenen Guides hochzuladen und 90% des Umsatzes zu behalten.
        </p>
        
        <button 
          onClick={() => {
            const provider = new GoogleAuthProvider();
            signInWithPopup(auth, provider);
          }}
          className="bg-[#8A9A5B] text-white px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#6B7A46] transition-all flex items-center gap-2"
        >
          <LogIn size={16} /> Mit Google Einloggen
        </button>
      </div>
    );
  }

  const StatusItem = ({ label, isOk, description }: { label: string, isOk: boolean, description: string }) => (
    <div className="flex items-start gap-4 p-6 bg-[#FAF9F6] rounded-2xl border border-[#E5E2D9]">
      {isOk ? (
        <CheckCircle2 className="text-green-500 shrink-0" size={24} />
      ) : (
        <XCircle className="text-red-400 shrink-0" size={24} />
      )}
      <div>
        <h4 className="text-sm font-bold text-[#2D2A26] mb-1">{label}</h4>
        <p className="text-xs text-[#6B6658] leading-relaxed">{description}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex" id="admin-panel">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#E5E2D9] p-8 flex flex-col gap-10">
        <div className="text-xl font-serif font-bold italic tracking-tight text-[#2D2A26]">{isAdmin ? 'Admin Panel' : 'Creator Hub'}</div>
        <nav className="flex flex-col gap-2" id="admin-nav">
          <button 
            data-testid="nav-recipes"
            onClick={() => setActiveTab('recipes')}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all text-xs font-bold uppercase tracking-wider ${activeTab === 'recipes' ? 'bg-[#8A9A5B] text-white shadow-sm' : 'text-[#6B6658] hover:bg-[#F2EFE9]'}`}
          >
            <Utensils size={18} strokeWidth={1.5} /> {isAdmin ? 'Produkte' : 'Meine Guides'}
          </button>
          <button 
            data-testid="nav-orders"
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all text-xs font-bold uppercase tracking-wider ${activeTab === 'orders' ? 'bg-[#8A9A5B] text-white shadow-sm' : 'text-[#6B6658] hover:bg-[#F2EFE9]'}`}
          >
            <ShoppingBag size={18} strokeWidth={1.5} /> {isAdmin ? 'Bestellungen' : 'Meine Verkäufe'}
          </button>
          {isAdmin && (
            <button 
              data-testid="nav-system"
              onClick={() => setActiveTab('system')}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all text-xs font-bold uppercase tracking-wider ${activeTab === 'system' ? 'bg-[#8A9A5B] text-white shadow-sm' : 'text-[#6B6658] hover:bg-[#F2EFE9]'}`}
            >
              <Settings size={18} strokeWidth={1.5} /> System / AI
            </button>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-12 overflow-auto" id="admin-content">
        {activeTab === 'recipes' ? (
          <div id="recipe-management">
            {/* Header Stats */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-serif italic text-[#2D2A26]">Produkte Verwalten</h2>
              <button 
                id="btn-add-recipe"
                className="bg-[#2D2A26] text-white px-6 py-3 rounded-xl flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:bg-black transition-all shadow-lg"
                onClick={() => document.getElementById('add-recipe-modal')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Plus size={18} /> Neues Produkt
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              <div className="bg-white rounded-2xl p-6 border border-[#E5E2D9]">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#6B6658] mb-2">{isAdmin ? 'Gesamt' : 'Meine Guides'}</div>
                <div className="text-3xl font-serif italic text-[#2D2A26]">{recipes.length}</div>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-[#E5E2D9]">
                <div className="text-[10px] font-bold uppercase tracking-widest text-green-600 mb-2">Live</div>
                <div className="text-3xl font-serif italic text-green-600">{onlineCount}</div>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-[#E5E2D9]">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#6B6658] mb-2">{isAdmin ? 'Offline' : 'Entwürfe'}</div>
                <div className="text-3xl font-serif italic text-[#6B6658]">{offlineCount}</div>
              </div>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-[#E5E2D9] overflow-hidden mb-12">
              <table className="w-full text-left" id="recipes-table">
                <thead className="bg-[#F2EFE9] border-b border-[#E5E2D9] uppercase text-[9px] font-bold tracking-[0.2em] text-[#6B6658]">
                  <tr>
                    <th className="p-6">Bild</th>
                    <th className="p-6">Titel</th>
                    <th className="p-6">Kategorie</th>
                    <th className="p-6">Preis</th>
                    <th className="p-6">Status</th>
                    <th className="p-6 text-right">Aktion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2EFE9]">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-[#6B6658]">
                        <div className="w-8 h-8 border-4 border-[#8A9A5B] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        Lädt...
                      </td>
                    </tr>
                  ) : recipes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-[#6B6658]">
                        Keine Produkte vorhanden. Füge oben ein neues Produkt hinzu.
                      </td>
                    </tr>
                  ) : recipes.map(recipe => (
                    <tr key={recipe.id} className="hover:bg-[#FAF9F6] transition-colors" data-recipe-id={recipe.id}>
                      <td className="p-6">
                        <img src={recipe.imageUrl} alt={recipe.title} className="w-12 h-12 rounded-lg object-cover border border-[#E5E2D9]" />
                      </td>
                      <td className="p-6 font-serif italic text-[#2D2A26]">{recipe.title}</td>
                      <td className="p-6 text-xs text-[#6B6658] font-bold uppercase tracking-widest">{recipe.category}</td>
                      <td className="p-6 font-bold text-[#2D2A26]">{(recipe.price / 100).toFixed(2)}€</td>
                      <td className="p-6">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                          recipe.isOnline 
                            ? 'bg-[#D9DED1] text-green-800' 
                            : 'bg-[#F2EFE9] text-[#6B6658]'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${recipe.isOnline ? 'bg-green-600' : 'bg-gray-400'}`} />
                          {recipe.isOnline ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleToggleOnline(recipe)}
                            className={`p-2 rounded-lg transition-colors ${recipe.isOnline ? 'text-[#6B6658] hover:bg-yellow-50' : 'text-green-600 hover:bg-green-50'}`}
                            title={recipe.isOnline ? 'Offline schalten' : 'Online schalten'}
                          >
                            {recipe.isOnline ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
                          </button>
                          <button 
                            onClick={() => handleEditRecipe(recipe)}
                            className="p-2 text-[#6B6658] hover:bg-[#F2EFE9] rounded-lg transition-colors"
                            title="Bearbeiten"
                          >
                            <Edit3 size={18} strokeWidth={1.5} />
                          </button>
                          <button 
                            onClick={() => recipe.contentUrl && window.open(recipe.contentUrl, '_blank')}
                            disabled={!recipe.contentUrl}
                            className={`p-2 rounded-lg transition-colors ${recipe.contentUrl ? 'text-[#6B6658] hover:bg-[#F2EFE9]' : 'text-[#E5E2D9] cursor-not-allowed'}`}
                            title="PDF öffnen"
                          >
                            <ExternalLink size={18} strokeWidth={1.5} />
                          </button>
                          <button 
                            onClick={() => handleDelete(recipe.id)}
                            className="p-2 text-[#E5E2D9] hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                            title="Löschen"
                          >
                            <Trash2 size={18} strokeWidth={1.5} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Recipe Form */}
            <div id="add-recipe-modal" className="bg-white rounded-[2rem] shadow-sm border border-[#E5E2D9] p-10">
              <h3 className="text-xl font-serif italic mb-8 text-[#2D2A26]">Neues Produkt hinzufügen</h3>
              <form onSubmit={handleAddRecipe} className="grid grid-cols-1 md:grid-cols-2 gap-8" id="form-recipe">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6B6658] mb-3">Titel</label>
                  <input 
                    id="input-title"
                    required
                    type="text" 
                    value={newRecipe.title} 
                    onChange={e => setNewRecipe({ ...newRecipe, title: e.target.value })}
                    className="w-full bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl p-4 text-sm focus:outline-none focus:border-[#8A9A5B] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6B6658] mb-3">Kategorie</label>
                  <select 
                    id="select-category"
                    value={newRecipe.category} 
                    onChange={e => setNewRecipe({ ...newRecipe, category: e.target.value })}
                    className="w-full bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl p-4 text-sm focus:outline-none focus:border-[#8A9A5B] transition-colors"
                  >
                    <option>Lifestyle</option>
                    <option>Wellness</option>
                    <option>Food</option>
                    <option>Business</option>
                    <option>Quick</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6B6658] mb-3">Beschreibung</label>
                  <textarea 
                    id="input-description"
                    required
                    value={newRecipe.description} 
                    onChange={e => setNewRecipe({ ...newRecipe, description: e.target.value })}
                    className="w-full bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl p-4 h-32 text-sm focus:outline-none focus:border-[#8A9A5B] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6B6658] mb-3">Preis (in Cent)</label>
                  <input 
                    id="input-price"
                    required
                    type="number" 
                    value={newRecipe.price} 
                    onChange={e => setNewRecipe({ ...newRecipe, price: Number(e.target.value) })}
                    className="w-full bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl p-4 text-sm focus:outline-none focus:border-[#8A9A5B] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6B6658] mb-3">Bild URL</label>
                  <input 
                    id="input-imageUrl"
                    required
                    type="text" 
                    value={newRecipe.imageUrl} 
                    onChange={e => setNewRecipe({ ...newRecipe, imageUrl: e.target.value })}
                    className="w-full bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl p-4 text-sm focus:outline-none focus:border-[#8A9A5B] transition-colors"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6B6658] mb-3">PDF Inhalts-URL (Download-Link)</label>
                  <input 
                    id="input-contentUrl"
                    required
                    type="text" 
                    placeholder="https://deine-cloud.com/rezept.pdf"
                    value={newRecipe.contentUrl} 
                    onChange={e => setNewRecipe({ ...newRecipe, contentUrl: e.target.value })}
                    className="w-full bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl p-4 text-sm focus:outline-none focus:border-[#8A9A5B] transition-colors"
                  />
                </div>
                {/* Progress Bar & Animation when publishing */}
                {isPublishing && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-[#F2EFE9] border border-[#E5E2D9] rounded-xl"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-widest text-[#6B6658]">
                        {publishStage || 'Verarbeitung...'}
                      </span>
                      <span className="text-xs text-[#6B6658]">{publishProgress}%</span>
                    </div>
                    <div className="w-full bg-[#E5E2D9] rounded-full h-2 overflow-hidden">
                      <motion.div
                        className="h-full bg-[#8A9A5B]"
                        initial={{ width: 0 }}
                        animate={{ width: `${publishProgress}%` }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                      />
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-[#6B6658]">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                        </svg>
                      </motion.div>
                      <span>Bitte warten, Produkt wird veröffentlicht...</span>
                    </div>
                  </motion.div>
                )}

                <div className="md:col-span-2">
                  <button 
                    id="btn-save-recipe" 
                    type="submit" 
                    disabled={isPublishing}
                    className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg transition-all mt-4 ${
                      isPublishing
                        ? 'bg-[#E5E2D9] text-[#6B6658] cursor-not-allowed'
                        : 'bg-[#8A9A5B] text-white hover:bg-[#6B7A46] shadow-[#8A9A5B]/20'
                    }`}
                  >
                    {isPublishing ? (
                      <span className="flex items-center justify-center gap-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-[#6B6658] border-t-transparent rounded-full"
                        />
                        Veröffentliche...
                      </span>
                    ) : (
                      'Produkt Veröffentlichen'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : activeTab === 'orders' ? (
          <div id="order-management">
            <h2 className="text-3xl font-serif italic text-[#2D2A26] mb-10">Bestellübersicht</h2>
            <div className="bg-white rounded-[2rem] shadow-sm border border-[#E5E2D9] overflow-hidden">
              <table className="w-full text-left" id="orders-table">
                <thead className="bg-[#F2EFE9] border-b border-[#E5E2D9] uppercase text-[9px] font-bold tracking-[0.2em] text-[#6B6658]">
                  <tr>
                    <th className="p-6">Datum</th>
                    <th className="p-6">Nutzer ID</th>
                    <th className="p-6">Betrag</th>
                    <th className="p-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2EFE9]">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-[#6B6658]">
                        Keine Bestellungen vorhanden.
                      </td>
                    </tr>
                  ) : orders.map(order => (
                    <tr key={order.id} className="hover:bg-[#FAF9F6] transition-colors" data-order-id={order.id}>
                      <td className="p-6 text-xs text-[#6B6658]">
                        {order.createdAt?.toDate?.()?.toLocaleDateString('de-DE') || 'N/A'}
                      </td>
                      <td className="p-6 font-mono text-[10px] text-[#6B6658]">{order.userId}</td>
                      <td className="p-6 font-bold text-[#2D2A26]">{(order.total / 100).toFixed(2)}€</td>
                      <td className="p-6 text-right">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                          order.status === 'completed' ? 'bg-[#D9DED1] text-green-800' : 'bg-[#F2EFE9] text-yellow-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div id="system-status">
            <h2 className="text-3xl font-serif italic text-[#2D2A26] mb-4">System & AI Integration</h2>
            <p className="text-[#6B6658] mb-10 text-sm">Prüfe hier den Status deiner Drittanbieter-Anbindungen und AI-Schnittstellen.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              <StatusItem 
                label="Stripe Integration"
                isOk={!!configStatus?.stripe}
                description="Ermöglicht sichere Zahlungen via Kreditkarte und PayPal. Notwendig für den Checkout."
              />
              <StatusItem 
                label="Resend Email Service"
                isOk={!!configStatus?.resend}
                description="Automatisiert den Versand der PDF-Downloadlinks nach erfolgreicher Zahlung."
              />
              <StatusItem 
                label="Stripe Webhook"
                isOk={!!configStatus?.webhook}
                description="Überwacht Zahlungsereignisse, um die PDF-Zustellung sofort auszulösen."
              />
              <StatusItem 
                label="AI Agent Access"
                isOk={!!configStatus?.adminKey}
                description="Erlaubt KI-Assistenten wie Hermes oder Openclaw den Zugriff auf Management-Daten über den API-Endpunkt /api/admin/system-dump."
              />
            </div>

            <div className="bg-white rounded-[2rem] border border-[#E5E2D9] p-10 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="px-3 py-1 bg-[#8A9A5B] text-white text-[10px] font-bold uppercase tracking-widest rounded-full">Test Mode</div>
                <h3 className="text-xl font-serif italic text-[#2D2A26]">Kaufprozess-Simulator</h3>
              </div>
              <p className="text-sm text-[#6B6658] leading-relaxed mb-8">
                Simuliere einen Kauf, um den Email-Versand und die Systemreaktion zu testen, ohne Stripe zu belasten.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6B6658] mb-3">Empfänger Email</label>
                  <input 
                    type="email" 
                    value={simEmail}
                    onChange={e => setSimEmail(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl p-4 text-sm focus:outline-none focus:border-[#8A9A5B] transition-colors"
                    placeholder="deine@email.de"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6B6658] mb-3">Test-Rezept wählen</label>
                  <select 
                    value={simRecipe}
                    onChange={e => setSimRecipe(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl p-4 text-sm focus:outline-none focus:border-[#8A9A5B] transition-colors"
                  >
                    {recipes.map(r => (
                      <option key={r.id} value={r.title}>{r.title}</option>
                    ))}
                    {recipes.length === 0 && <option>Keine Rezepte verfügbar</option>}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <button 
                    onClick={handleSimulatePurchase}
                    disabled={isSimulating || !configStatus?.resend}
                    className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg transition-all ${
                      isSimulating || !configStatus?.resend
                        ? 'bg-[#E5E2D9] text-[#6B6658] cursor-not-allowed'
                        : 'bg-[#2D2A26] text-white hover:bg-black shadow-black/10'
                    }`}
                  >
                    {isSimulating ? 'Simuliere...' : 'Kauf simulieren & Email senden'}
                  </button>
                  {!configStatus?.resend && (
                    <p className="text-[10px] text-red-400 mt-2 text-center uppercase tracking-widest">
                      Resend API Key fehlt - Simulation deaktiviert
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-[#E5E2D9] p-10">
              <h3 className="text-xl font-serif italic mb-4 text-[#2D2A26]">AI Assistant Info</h3>
              <p className="text-sm text-[#6B6658] leading-relaxed mb-6">
                Dein Admin Panel ist für AI Assistants optimiert. Agents können Daten direkt über eine REST-API auslesen oder das UI aufgrund der semantischen IDs effizienter navigieren.
              </p>
              <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#E5E2D9] font-mono text-[10px] text-[#2D2A26]">
                GET /api/admin/system-dump <br/>
                Authorization: Bearer [VITE_ADMIN_API_KEY]
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Edit Recipe Modal */}
      {editModalOpen && editingRecipe && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-[#E5E2D9] p-6 flex items-center justify-between">
              <h3 className="text-xl font-serif italic text-[#2D2A26]">Produkt Bearbeiten</h3>
              <button 
                onClick={() => { setEditModalOpen(false); setEditingRecipe(null); }}
                className="p-2 text-[#6B6658] hover:bg-[#F2EFE9] rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateRecipe} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6B6658] mb-3">Titel</label>
                <input 
                  type="text" 
                  value={editingRecipe.title} 
                  onChange={e => setEditingRecipe({ ...editingRecipe, title: e.target.value })}
                  className="w-full bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl p-4 text-sm focus:outline-none focus:border-[#8A9A5B] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6B6658] mb-3">Kategorie</label>
                <select 
                  value={editingRecipe.category} 
                  onChange={e => setEditingRecipe({ ...editingRecipe, category: e.target.value })}
                  className="w-full bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl p-4 text-sm focus:outline-none focus:border-[#8A9A5B] transition-colors"
                >
                  <option>Lifestyle</option>
                  <option>Wellness</option>
                  <option>Food</option>
                  <option>Business</option>
                  <option>Quick</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6B6658] mb-3">Preis (in Cent)</label>
                <input 
                  type="number" 
                  value={editingRecipe.price} 
                  onChange={e => setEditingRecipe({ ...editingRecipe, price: Number(e.target.value) })}
                  className="w-full bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl p-4 text-sm focus:outline-none focus:border-[#8A9A5B] transition-colors"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6B6658] mb-3">Beschreibung</label>
                <textarea 
                  value={editingRecipe.description} 
                  onChange={e => setEditingRecipe({ ...editingRecipe, description: e.target.value })}
                  className="w-full bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl p-4 h-32 text-sm focus:outline-none focus:border-[#8A9A5B] transition-colors"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6B6658] mb-3">Bild URL</label>
                <input 
                  type="text" 
                  value={editingRecipe.imageUrl} 
                  onChange={e => setEditingRecipe({ ...editingRecipe, imageUrl: e.target.value })}
                  className="w-full bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl p-4 text-sm focus:outline-none focus:border-[#8A9A5B] transition-colors"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6B6658] mb-3">PDF Inhalts-URL</label>
                <input 
                  type="text" 
                  value={editingRecipe.contentUrl || ''} 
                  onChange={e => setEditingRecipe({ ...editingRecipe, contentUrl: e.target.value })}
                  className="w-full bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl p-4 text-sm focus:outline-none focus:border-[#8A9A5B] transition-colors"
                />
              </div>
              <div className="md:col-span-2 flex items-center gap-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={editingRecipe.isOnline}
                    onChange={e => setEditingRecipe({ ...editingRecipe, isOnline: e.target.checked })}
                    className="w-5 h-5 rounded border-[#E5E2D9] text-[#8A9A5B] focus:ring-[#8A9A5B]"
                  />
                  <span className="text-sm font-medium text-[#2D2A26]">Online sichtbar</span>
                </label>
              </div>
              <div className="md:col-span-2">
                <button type="submit" className="w-full bg-[#8A9A5B] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-[#8A9A5B]/20 hover:bg-[#6B7A46] transition-all flex items-center justify-center gap-2">
                  <Save size={18} /> Änderungen Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
