'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Filter, ShoppingCart, Package, Plus, X } from 'lucide-react';
import { partsApi, ordersApi, Part, CreatePartDto, VehicleCompatibility } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function PartsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [parts, setParts] = useState<Part[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [isOrdering, setIsOrdering] = useState(false);

  // Create Part Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [newPart, setNewPart] = useState<CreatePartDto>({
    reference: '',
    name: '',
    description: '',
    category: '',
    brand: '',
    price: 0,
    initialStock: 0,
    compatibleVehicles: [],
  });
  const [newVehicle, setNewVehicle] = useState<VehicleCompatibility>({
    brand: '',
    model: '',
    yearFrom: 2020,
    yearTo: 2024,
  });

  const categories = [
    'Freinage',
    'Moteur',
    'Transmission',
    'Suspension',
    'Électrique',
    'Carrosserie',
  ];

  const fetchParts = async (page = 1) => {
    setIsLoading(true);
    try {
      const response = await partsApi.search({
        search: search || undefined,
        category: category || undefined,
        page,
        limit: 12,
      });
      setParts(response.data.items);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to fetch parts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchParts();
  }, [category]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchParts(1);
  };

  const addToCart = (partId: string) => {
    setCart((prev) => {
      const newCart = new Map(prev);
      newCart.set(partId, (newCart.get(partId) || 0) + 1);
      return newCart;
    });
  };

  const removeFromCart = (partId: string) => {
    setCart((prev) => {
      const newCart = new Map(prev);
      const current = newCart.get(partId) || 0;
      if (current <= 1) {
        newCart.delete(partId);
      } else {
        newCart.set(partId, current - 1);
      }
      return newCart;
    });
  };

  const cartTotal = Array.from(cart.entries()).reduce((total, [partId, qty]) => {
    const part = parts.find((p) => p.partId === partId);
    return total + (part?.price || 0) * qty;
  }, 0);

  // Create Order Handler
  const handleCreateOrder = async () => {
    if (cart.size === 0) return;

    setIsOrdering(true);
    try {
      const lines = Array.from(cart.entries()).map(([partId, quantity]) => ({
        partId,
        quantity,
      }));

      await ordersApi.create({ lines });
      setCart(new Map());
      router.push('/orders');
    } catch (error: any) {
      console.error('Failed to create order:', error);
      alert(error.response?.data?.message || 'Erreur lors de la création de la commande');
    } finally {
      setIsOrdering(false);
    }
  };

  // Create Part Handler
  const handleCreatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setCreateError('');

    try {
      await partsApi.create(newPart);
      setShowCreateModal(false);
      setNewPart({
        reference: '',
        name: '',
        description: '',
        category: '',
        brand: '',
        price: 0,
        initialStock: 0,
        compatibleVehicles: [],
      });
      fetchParts(1); // Refresh the list
    } catch (error: any) {
      setCreateError(error.response?.data?.message || 'Failed to create part');
    } finally {
      setIsCreating(false);
    }
  };

  const addVehicleCompatibility = () => {
    if (newVehicle.brand && newVehicle.model) {
      setNewPart((prev) => ({
        ...prev,
        compatibleVehicles: [...prev.compatibleVehicles, { ...newVehicle }],
      }));
      setNewVehicle({ brand: '', model: '', yearFrom: 2020, yearTo: 2024 });
    }
  };

  const removeVehicleCompatibility = (index: number) => {
    setNewPart((prev) => ({
      ...prev,
      compatibleVehicles: prev.compatibleVehicles.filter((_, i) => i !== index),
    }));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catalogue de pièces</h1>
          <p className="text-gray-600">
            {pagination.total} pièces disponibles
          </p>
        </div>

        {user?.role === 'SUPPLIER' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Ajouter une pièce</span>
          </button>
        )}

        {user?.role === 'GARAGE' && cart.size > 0 && (
          <div className="card flex items-center space-x-4">
            <ShoppingCart className="h-5 w-5 text-primary-600" />
            <div>
              <p className="font-medium">{cart.size} article(s)</p>
              <p className="text-sm text-gray-500">
                {cartTotal.toLocaleString('fr-FR', {
                  style: 'currency',
                  currency: 'EUR',
                })}
              </p>
            </div>
            <button
              onClick={handleCreateOrder}
              disabled={isOrdering}
              className="btn-primary disabled:opacity-50"
            >
              {isOrdering ? 'Commande...' : 'Commander'}
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4">
          <form onSubmit={handleSearch} className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une pièce..."
                className="input pl-10"
              />
            </div>
          </form>

          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input w-auto"
            >
              <option value="">Toutes catégories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Parts Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : parts.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {parts.map((part) => (
              <div key={part.partId} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-primary-50 rounded-lg">
                    <Package className="h-6 w-6 text-primary-600" />
                  </div>
                  {part.stock.isOutOfStock ? (
                    <span className="badge bg-red-100 text-red-800">Rupture</span>
                  ) : part.stock.isLow ? (
                    <span className="badge bg-yellow-100 text-yellow-800">Stock faible</span>
                  ) : (
                    <span className="badge bg-green-100 text-green-800">En stock</span>
                  )}
                </div>

                <h3 className="font-semibold text-gray-900 mb-1">{part.name}</h3>
                <p className="text-sm text-gray-500 mb-2">{part.reference}</p>
                <p className="text-xs text-gray-400 mb-3">
                  {part.brand} • {part.category}
                </p>

                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-bold text-primary-600">
                    {part.priceFormatted}
                  </span>
                  <span className="text-sm text-gray-500">
                    {part.stock.available} dispo.
                  </span>
                </div>

                <p className="text-xs text-gray-500 mb-4">
                  Fournisseur: {part.supplier.name}
                </p>

                {user?.role === 'GARAGE' && (
                  <div className="flex items-center space-x-2">
                    {cart.has(part.partId) ? (
                      <>
                        <button
                          onClick={() => removeFromCart(part.partId)}
                          className="btn-secondary px-3"
                        >
                          -
                        </button>
                        <span className="px-3 font-medium">
                          {cart.get(part.partId)}
                        </span>
                        <button
                          onClick={() => addToCart(part.partId)}
                          className="btn-secondary px-3"
                          disabled={part.stock.isOutOfStock}
                        >
                          +
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => addToCart(part.partId)}
                        disabled={part.stock.isOutOfStock}
                        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Ajouter au panier
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center mt-8 space-x-2">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => fetchParts(page)}
                    className={`px-4 py-2 rounded-lg ${
                      page === pagination.page
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Aucune pièce trouvée</p>
        </div>
      )}

      {/* Create Part Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Ajouter une pièce</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleCreatePart} className="p-6 space-y-4">
              {createError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {createError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Référence *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPart.reference}
                    onChange={(e) => setNewPart({ ...newPart, reference: e.target.value })}
                    placeholder="BOSCH-FLT-12345"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPart.name}
                    onChange={(e) => setNewPart({ ...newPart, name: e.target.value })}
                    placeholder="Filtre à huile BOSCH"
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newPart.description}
                  onChange={(e) => setNewPart({ ...newPart, description: e.target.value })}
                  placeholder="Description détaillée de la pièce..."
                  rows={3}
                  className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Catégorie *
                  </label>
                  <select
                    required
                    value={newPart.category}
                    onChange={(e) => setNewPart({ ...newPart, category: e.target.value })}
                    className="input"
                  >
                    <option value="">Sélectionner...</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Marque *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPart.brand}
                    onChange={(e) => setNewPart({ ...newPart, brand: e.target.value })}
                    placeholder="BOSCH"
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prix (EUR) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={newPart.price || ''}
                    onChange={(e) => setNewPart({ ...newPart, price: parseFloat(e.target.value) || 0 })}
                    placeholder="12.99"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock initial *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newPart.initialStock || ''}
                    onChange={(e) => setNewPart({ ...newPart, initialStock: parseInt(e.target.value) || 0 })}
                    placeholder="50"
                    className="input"
                  />
                </div>
              </div>

              {/* Vehicle Compatibility */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Véhicules compatibles
                </label>

                <div className="grid grid-cols-4 gap-2 mb-2">
                  <input
                    type="text"
                    value={newVehicle.brand}
                    onChange={(e) => setNewVehicle({ ...newVehicle, brand: e.target.value })}
                    placeholder="Marque"
                    className="input text-sm"
                  />
                  <input
                    type="text"
                    value={newVehicle.model}
                    onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                    placeholder="Modèle"
                    className="input text-sm"
                  />
                  <input
                    type="number"
                    value={newVehicle.yearFrom}
                    onChange={(e) => setNewVehicle({ ...newVehicle, yearFrom: parseInt(e.target.value) })}
                    placeholder="Année début"
                    className="input text-sm"
                  />
                  <input
                    type="number"
                    value={newVehicle.yearTo}
                    onChange={(e) => setNewVehicle({ ...newVehicle, yearTo: parseInt(e.target.value) })}
                    placeholder="Année fin"
                    className="input text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={addVehicleCompatibility}
                  className="btn-secondary text-sm"
                >
                  + Ajouter véhicule
                </button>

                {newPart.compatibleVehicles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {newPart.compatibleVehicles.map((v, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="text-sm">
                          {v.brand} {v.model} ({v.yearFrom}-{v.yearTo})
                        </span>
                        <button
                          type="button"
                          onClick={() => removeVehicleCompatibility(i)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="btn-primary disabled:opacity-50"
                >
                  {isCreating ? 'Création...' : 'Créer la pièce'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
