import React, { useEffect, useState } from 'react';
import { auth } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { getAllRecipes, createRecipe, deleteRecipe, updateRecipe, toggleRecipeOnline } from '../services/recipeService';
import { getAllOrders } from '../services/orderService';
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

  const [passwordInput, setPasswordInput] = useState('');
  const [passwordAuth, setPasswordAuth] = useState(false);
  
  const ADMIN_PASSWORD = '24211vj051vj89058901jv51j1jj890v511111j8v598v5901890v51va';

  const isAdmin = user?.email === 'julianlegendstar@gmail.com' || passwordAuth;

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setPasswordAuth(true);
      toast.success('Zugang via Passwort gewährt!');
    } else {
      toast.error('Falsches Passwort');
    }
  };

  const loadData = async () => {
    try {
      const [r, o, config] = await Promise.all([
        getAllRecipes(), 
        getAllOrders(),
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
    if (isAdmin) {
      loadData().finally(() => setLoading(false));
    }
  }, [isAdmin]);

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
          adminKey: import.meta.env.VITE_ADMIN_API_KEY
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
    try {
      await createRecipe(newRecipe);
      toast.success('Produkt hinzugefügt und veröffentlicht!');
      setNewRecipe({ title: '', description: '', price: 0, imageUrl: '', category: 'Lifestyle', contentUrl: '', isOnline: true });
      await loadData();
      // Scroll to top to see the new product in the table
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      console.error('Save error details:', error);
      const errorMessage = error?.message || String(error);
      toast.error(`Fehler: ${errorMessage.substring(0, 100)}`);
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

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAF9F6] p-6 text-center">
        <div className="w-16 h-16 bg-[#F2EFE9] text-[#2D2A26] rounded-full flex items-center justify-center mb-6">
          <ShieldAlert size={32} strokeWidth={1.5} />
        </div>
        <h1 className="text-3xl font-serif italic text-[#2D2A26] mb-4">Zugriff Verweigert</h1>
        <p className="text-[#6B6658] mb-8 max-w-sm text-sm">
          {user 
            ? `Eingeloggt als ${user.email}. Dieses Konto hat keine Admin-Rechte.`
            : 'Bitte logge dich ein oder gib das Passwort ein.'}
        </p>
        
        {/* Passwort-Formular */}
        <form onSubmit={handlePasswordSubmit} className="w-full max-w-sm mb-8">
          <div className="flex gap-2">
            <input 
              type="password" 
              placeholder="Admin Passwort" 
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              className="flex-1 bg-white border border-[#E5E2D9] rounded-xl p-3 text-sm focus:outline-none focus:border-[#8A9A5B]"
            />
            <button 
              type="submit"
              className="bg-[#2D2A26] text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-all"
            >
              Einloggen
            </button>
          </div>
        </form>

        {user ? (
          <button 
            onClick={() => auth.signOut()}
            className="bg-[#2D2A26] text-white px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2"
          >
            <LogOut size={16} /> Abmelden
          </button>
        ) : (
          <button 
            onClick={() => {
              const provider = new GoogleAuthProvider();
              signInWithPopup(auth, provider);
            }}
            className="bg-[#8A9A5B] text-white px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#6B7A46] transition-all flex items-center gap-2"
          >
            <LogIn size={16} /> Mit Google Einloggen
          </button>
        )}
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
        <div className="text-xl font-serif font-bold italic tracking-tight text-[#2D2A26]">Admin Panel</div>
        <nav className="flex flex-col gap-2" id="admin-nav">
          <button 
            data-testid="nav-recipes"
            onClick={() => setActiveTab('recipes')}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all text-xs font-bold uppercase tracking-wider ${activeTab === 'recipes' ? 'bg-[#8A9A5B] text-white shadow-sm' : 'text-[#6B6658] hover:bg-[#F2EFE9]'}`}
          >
            <Utensils size={18} strokeWidth={1.5} /> Produkte
          </button>
          <button 
            data-testid="nav-orders"
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all text-xs font-bold uppercase tracking-wider ${activeTab === 'orders' ? 'bg-[#8A9A5B] text-white shadow-sm' : 'text-[#6B6658] hover:bg-[#F2EFE9]'}`}
          >
            <ShoppingBag size={18} strokeWidth={1.5} /> Bestellungen
          </button>
          <button 
            data-testid="nav-system"
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all text-xs font-bold uppercase tracking-wider ${activeTab === 'system' ? 'bg-[#8A9A5B] text-white shadow-sm' : 'text-[#6B6658] hover:bg-[#F2EFE9]'}`}
          >
            <Settings size={18} strokeWidth={1.5} /> System / AI
          </button>
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
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#6B6658] mb-2">Gesamt</div>
                <div className="text-3xl font-serif italic text-[#2D2A26]">{recipes.length}</div>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-[#E5E2D9]">
                <div className="text-[10px] font-bold uppercase tracking-widest text-green-600 mb-2">Online</div>
                <div className="text-3xl font-serif italic text-green-600">{onlineCount}</div>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-[#E5E2D9]">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#6B6658] mb-2">Offline</div>
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
                <div className="md:col-span-2">
                  <button id="btn-save-recipe" type="submit" className="w-full bg-[#8A9A5B] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-[#8A9A5B]/20 hover:bg-[#6B7A46] transition-all mt-4">
                    Produkt Veröffentlichen
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
