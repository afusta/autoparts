'use client';

import { useEffect, useState } from 'react';
import { Search, Filter, ShoppingCart, Package } from 'lucide-react';
import { partsApi, Part, PaginatedResponse } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function PartsPage() {
  const { user } = useAuthStore();
  const [parts, setParts] = useState<Part[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [cart, setCart] = useState<Map<string, number>>(new Map());

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

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catalogue de pièces</h1>
          <p className="text-gray-600">
            {pagination.total} pièces disponibles
          </p>
        </div>

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
            <button className="btn-primary">Commander</button>
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
    </div>
  );
}
