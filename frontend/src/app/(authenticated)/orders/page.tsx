'use client';

import { useEffect, useState } from 'react';
import { ShoppingCart, Check, Truck, Package, X } from 'lucide-react';
import { ordersApi, Order } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

const statusConfig: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  PENDING: { label: 'En attente', icon: ShoppingCart, color: 'badge-pending' },
  CONFIRMED: { label: 'Confirmée', icon: Check, color: 'badge-confirmed' },
  SHIPPED: { label: 'Expédiée', icon: Truck, color: 'badge-shipped' },
  DELIVERED: { label: 'Livrée', icon: Package, color: 'badge-delivered' },
  CANCELLED: { label: 'Annulée', icon: X, color: 'badge-cancelled' },
};

export default function OrdersPage() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const isGarage = user?.role === 'GARAGE';
  const isSupplier = user?.role === 'SUPPLIER';

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const response = isGarage
        ? await ordersApi.getMyOrders({ status: statusFilter || undefined })
        : await ordersApi.getSupplierOrders({ status: statusFilter || undefined });
      setOrders(response.data.items);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, user]);

  const handleAction = async (orderId: string, action: string) => {
    try {
      switch (action) {
        case 'confirm':
          await ordersApi.confirm(orderId);
          break;
        case 'ship':
          await ordersApi.ship(orderId);
          break;
        case 'deliver':
          await ordersApi.deliver(orderId);
          break;
        case 'cancel':
          const reason = prompt('Raison de l\'annulation :');
          if (reason) {
            await ordersApi.cancel(orderId, reason);
          } else {
            return;
          }
          break;
      }
      fetchOrders();
      setSelectedOrder(null);
    } catch (error) {
      console.error('Action failed:', error);
      alert('Erreur lors de l\'action');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isGarage ? 'Mes commandes' : 'Commandes reçues'}
          </h1>
          <p className="text-gray-600">
            {orders.length} commande(s)
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input w-auto"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(statusConfig).map(([status, config]) => (
            <option key={status} value={status}>
              {config.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => {
            const status = statusConfig[order.status] || statusConfig.PENDING;
            const StatusIcon = status.icon;

            return (
              <div
                key={order.orderId}
                className="card hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gray-100 rounded-lg">
                      <StatusIcon className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        Commande #{order.orderId.slice(0, 8)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                      {isSupplier && (
                        <p className="text-sm text-gray-500">
                          Client: {order.garage.name}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      {order.totalFormatted}
                    </p>
                    <span className={status.color}>{status.label}</span>
                    <p className="text-sm text-gray-500 mt-1">
                      {order.lines.length} article(s)
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Aucune commande</p>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Commande #{selectedOrder.orderId.slice(0, 8)}
                  </h2>
                  <p className="text-gray-500">
                    {new Date(selectedOrder.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Status */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Statut</h3>
                <span className={statusConfig[selectedOrder.status]?.color}>
                  {statusConfig[selectedOrder.status]?.label}
                </span>
              </div>

              {/* Client Info (for suppliers) */}
              {isSupplier && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Client</h3>
                  <p className="text-gray-600">{selectedOrder.garage.name}</p>
                </div>
              )}

              {/* Order Lines */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Articles</h3>
                <div className="space-y-3">
                  {selectedOrder.lines.map((line, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{line.partName}</p>
                        <p className="text-sm text-gray-500">
                          {line.partReference} • {line.supplierName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{line.totalFormatted}</p>
                        <p className="text-sm text-gray-500">x{line.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="border-t border-gray-200 pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-primary-600">
                    {selectedOrder.totalFormatted}
                  </span>
                </div>
              </div>

              {/* Status History */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Historique</h3>
                <div className="space-y-2">
                  {selectedOrder.statusHistory.map((entry, index) => (
                    <div key={index} className="flex items-center text-sm">
                      <span className="w-24 text-gray-500">
                        {new Date(entry.changedAt).toLocaleDateString('fr-FR')}
                      </span>
                      <span className={statusConfig[entry.status]?.color}>
                        {statusConfig[entry.status]?.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Supplier Actions */}
              {isSupplier && (
                <div className="flex flex-wrap gap-3">
                  {selectedOrder.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleAction(selectedOrder.orderId, 'confirm')}
                        className="btn-primary"
                      >
                        Confirmer
                      </button>
                      <button
                        onClick={() => handleAction(selectedOrder.orderId, 'cancel')}
                        className="btn-danger"
                      >
                        Annuler
                      </button>
                    </>
                  )}
                  {selectedOrder.status === 'CONFIRMED' && (
                    <button
                      onClick={() => handleAction(selectedOrder.orderId, 'ship')}
                      className="btn-primary"
                    >
                      Marquer comme expédiée
                    </button>
                  )}
                </div>
              )}

              {/* Garage Actions */}
              {isGarage && (
                <div className="flex flex-wrap gap-3">
                  {selectedOrder.status === 'PENDING' && (
                    <button
                      onClick={() => handleAction(selectedOrder.orderId, 'cancel')}
                      className="btn-danger"
                    >
                      Annuler la commande
                    </button>
                  )}
                  {selectedOrder.status === 'SHIPPED' && (
                    <button
                      onClick={() => handleAction(selectedOrder.orderId, 'deliver')}
                      className="btn-primary"
                    >
                      Confirmer la réception
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
