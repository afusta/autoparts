'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Package,
  ArrowLeft,
  ShoppingCart,
  Car,
  Building,
  Tag,
  Layers,
  PackagePlus,
  Edit,
  X,
} from 'lucide-react';
import { partsApi, ordersApi, PartDetail, UpdatePartDto } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function PartDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const partId = params.partId as string;

  const [part, setPart] = useState<PartDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isOrdering, setIsOrdering] = useState(false);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [editData, setEditData] = useState<UpdatePartDto>({});

  // Stock Modal State
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockQuantity, setStockQuantity] = useState(0);
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [stockError, setStockError] = useState('');

  const categories = [
    'Freinage',
    'Moteur',
    'Transmission',
    'Suspension',
    'Électrique',
    'Carrosserie',
  ];

  useEffect(() => {
    const fetchPart = async () => {
      setIsLoading(true);
      try {
        const response = await partsApi.getById(partId);
        setPart(response.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load part');
      } finally {
        setIsLoading(false);
      }
    };

    if (partId) {
      fetchPart();
    }
  }, [partId]);

  const handleOrder = async () => {
    if (!part || quantity <= 0) return;

    setIsOrdering(true);
    try {
      await ordersApi.create({
        lines: [{ partId: part.partId, quantity }],
      });
      router.push('/orders');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de la commande');
    } finally {
      setIsOrdering(false);
    }
  };

  // Edit handlers
  const openEditModal = () => {
    if (!part) return;
    setEditData({
      name: part.name,
      description: part.description,
      category: part.category,
      brand: part.brand,
      price: part.price,
    });
    setUpdateError('');
    setShowEditModal(true);
  };

  const handleUpdatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!part) return;

    setIsUpdating(true);
    setUpdateError('');

    try {
      const response = await partsApi.update(part.partId, editData);
      setPart({ ...part, ...response.data });
      setShowEditModal(false);
    } catch (err: any) {
      setUpdateError(err.response?.data?.message || 'Failed to update part');
    } finally {
      setIsUpdating(false);
    }
  };

  // Stock handlers
  const openStockModal = () => {
    setStockQuantity(0);
    setStockError('');
    setShowStockModal(true);
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!part || stockQuantity <= 0) return;

    setIsAddingStock(true);
    setStockError('');

    try {
      const response = await partsApi.addStock(part.partId, stockQuantity);
      setPart({ ...part, stock: response.data.stock });
      setShowStockModal(false);
    } catch (err: any) {
      setStockError(err.response?.data?.message || 'Failed to add stock');
    } finally {
      setIsAddingStock(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !part) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">{error || 'Pièce non trouvée'}</p>
        <Link href="/parts" className="btn-primary mt-4 inline-block">
          Retour au catalogue
        </Link>
      </div>
    );
  }

  const isOwner = user?.role === 'SUPPLIER' && part.supplier.id === user.id;

  return (
    <div>
      {/* Back Button */}
      <Link
        href="/parts"
        className="inline-flex items-center text-gray-600 hover:text-primary-600 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour au catalogue
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <div className="card">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-primary-50 rounded-lg">
                <Package className="h-8 w-8 text-primary-600" />
              </div>
              {part.stock.isOutOfStock ? (
                <span className="badge bg-red-100 text-red-800 text-sm">Rupture de stock</span>
              ) : part.stock.isLow ? (
                <span className="badge bg-yellow-100 text-yellow-800 text-sm">Stock faible</span>
              ) : (
                <span className="badge bg-green-100 text-green-800 text-sm">En stock</span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">{part.name}</h1>
            <p className="text-gray-500 font-mono mb-4">{part.reference}</p>

            {part.description && (
              <p className="text-gray-600 mb-6">{part.description}</p>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <Tag className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Marque</p>
                  <p className="font-medium">{part.brand}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Layers className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Catégorie</p>
                  <p className="font-medium">{part.category}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Building className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Fournisseur</p>
                  <p className="font-medium">{part.supplier.name}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Stock disponible</p>
                  <p className="font-medium">{part.stock.available} unités</p>
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle Compatibility */}
          {part.compatibleVehicles && part.compatibleVehicles.length > 0 && (
            <div className="card">
              <div className="flex items-center space-x-2 mb-4">
                <Car className="h-5 w-5 text-primary-600" />
                <h2 className="text-lg font-semibold">Véhicules compatibles</h2>
                <span className="text-sm text-gray-500">
                  ({part.compatibleVehicles.length} véhicule{part.compatibleVehicles.length > 1 ? 's' : ''})
                </span>
              </div>

              {/* Table Header */}
              <div className="hidden md:grid md:grid-cols-4 gap-4 px-4 py-2 bg-gray-100 rounded-t-lg text-xs font-semibold text-gray-600 uppercase">
                <div>Marque</div>
                <div>Modèle</div>
                <div>Années</div>
                <div>Moteur</div>
              </div>

              <div className="divide-y divide-gray-100">
                {part.compatibleVehicles.map((vehicle, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4 p-4 hover:bg-gray-50 transition-colors"
                  >
                    {/* Mobile: Labels inline */}
                    <div className="md:hidden space-y-1">
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">Marque:</span>
                        <span className="font-medium text-gray-900">{vehicle.brand}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">Modèle:</span>
                        <span className="font-medium text-gray-900">{vehicle.model}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">Années:</span>
                        <span className="text-gray-600">{vehicle.yearFrom} - {vehicle.yearTo}</span>
                      </div>
                      {vehicle.engine && (
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-500">Moteur:</span>
                          <span className="text-gray-600">{vehicle.engine}</span>
                        </div>
                      )}
                    </div>

                    {/* Desktop: Table layout */}
                    <div className="hidden md:block font-medium text-gray-900">{vehicle.brand}</div>
                    <div className="hidden md:block text-gray-700">{vehicle.model}</div>
                    <div className="hidden md:block text-gray-600">{vehicle.yearFrom} - {vehicle.yearTo}</div>
                    <div className="hidden md:block text-gray-500">{vehicle.engine || '-'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Frequently Ordered Together */}
          {part.frequentlyOrderedWith && part.frequentlyOrderedWith.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Souvent commandé avec</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {part.frequentlyOrderedWith.map((related) => (
                  <Link
                    key={related.partId}
                    href={`/parts/${related.partId}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{related.name}</p>
                      <p className="text-sm text-gray-500">{related.reference}</p>
                    </div>
                    <span className="text-xs text-primary-600">
                      {related.count} fois
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Price & Actions */}
        <div className="space-y-6">
          {/* Price Card */}
          <div className="card">
            <div className="text-center mb-6">
              <p className="text-3xl font-bold text-primary-600">{part.priceFormatted}</p>
              <p className="text-sm text-gray-500">Prix unitaire TTC</p>
            </div>

            {/* Garage: Order Section */}
            {user?.role === 'GARAGE' && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantité
                  </label>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="btn-secondary px-3 py-2"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={part.stock.available}
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      className="input text-center w-20"
                    />
                    <button
                      onClick={() =>
                        setQuantity(Math.min(part.stock.available, quantity + 1))
                      }
                      className="btn-secondary px-3 py-2"
                      disabled={quantity >= part.stock.available}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total</span>
                    <span className="font-bold text-gray-900">
                      {(part.price * quantity).toLocaleString('fr-FR', {
                        style: 'currency',
                        currency: 'EUR',
                      })}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleOrder}
                  disabled={part.stock.isOutOfStock || isOrdering}
                  className="w-full btn-primary flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <ShoppingCart className="h-5 w-5" />
                  <span>{isOrdering ? 'Commande...' : 'Commander maintenant'}</span>
                </button>
              </>
            )}

            {/* Supplier: Edit & Stock Actions */}
            {isOwner && (
              <div className="space-y-3">
                <button
                  onClick={openEditModal}
                  className="w-full btn-secondary flex items-center justify-center space-x-2"
                >
                  <Edit className="h-5 w-5" />
                  <span>Modifier la pièce</span>
                </button>
                <button
                  onClick={openStockModal}
                  className="w-full btn-primary flex items-center justify-center space-x-2"
                >
                  <PackagePlus className="h-5 w-5" />
                  <span>Ajouter du stock</span>
                </button>
              </div>
            )}
          </div>

          {/* Stock Info Card */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Information stock</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Quantité totale</span>
                <span className="font-medium">{part.stock.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Réservé</span>
                <span className="font-medium">{part.stock.quantity - part.stock.available}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-600">Disponible</span>
                <span className="font-bold text-primary-600">{part.stock.available}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Part Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Modifier la pièce</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleUpdatePart} className="p-6 space-y-4">
              {updateError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {updateError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input
                  type="text"
                  value={editData.name || ''}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editData.description || ''}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  rows={3}
                  className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Catégorie
                  </label>
                  <select
                    value={editData.category || ''}
                    onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                    className="input"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marque</label>
                  <input
                    type="text"
                    value={editData.brand || ''}
                    onChange={(e) => setEditData({ ...editData, brand: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prix (EUR)
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={editData.price || ''}
                  onChange={(e) =>
                    setEditData({ ...editData, price: parseFloat(e.target.value) || 0 })
                  }
                  className="input"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn-secondary"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="btn-primary disabled:opacity-50"
                >
                  {isUpdating ? 'Mise à jour...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Modal */}
      {showStockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Ajouter du stock</h2>
              <button
                onClick={() => setShowStockModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleAddStock} className="p-6 space-y-4">
              {stockError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {stockError}
                </div>
              )}

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium text-gray-900">{part.name}</p>
                <p className="text-sm text-gray-500">{part.reference}</p>
                <div className="mt-2 text-sm">
                  <span className="text-gray-600">Stock actuel: </span>
                  <span className="font-medium">{part.stock.quantity}</span>
                  <span className="text-gray-400 ml-2">
                    ({part.stock.available} disponible)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantité à ajouter *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={stockQuantity || ''}
                  onChange={(e) => setStockQuantity(parseInt(e.target.value) || 0)}
                  placeholder="10"
                  className="input"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowStockModal(false)}
                  className="btn-secondary"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isAddingStock || stockQuantity <= 0}
                  className="btn-primary disabled:opacity-50"
                >
                  {isAddingStock ? 'Ajout...' : 'Ajouter le stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
