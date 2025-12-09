"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { ordersApi, analyticsApi, Order, TopSupplier } from "@/lib/api";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [topSuppliers, setTopSuppliers] = useState<TopSupplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuppliersLoading, setIsSuppliersLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response =
          user?.role === "GARAGE"
            ? await ordersApi.getMyOrders()
            : await ordersApi.getSupplierOrders();
        setRecentOrders(response.data.items);
      } catch (error) {
        console.error("Failed to fetch orders:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchOrders();
    }
  }, [user]);

  useEffect(() => {
    const fetchTopSuppliers = async () => {
      if (user?.role !== "GARAGE") {
        setIsSuppliersLoading(false);
        return;
      }
      try {
        const response = await analyticsApi.getMyTopSuppliers();
        setTopSuppliers(response.data);
      } catch (error) {
        console.error("Failed to fetch top suppliers:", error);
      } finally {
        setIsSuppliersLoading(false);
      }
    };

    if (user) {
      fetchTopSuppliers();
    }
  }, [user]);

  const stats = [
    {
      name: "Commandes ce mois",
      value: recentOrders.length,
      icon: ShoppingCart,
      color: "bg-blue-500",
    },
    // {
    //   name: 'Pièces disponibles',
    //   value: '1,234',
    //   icon: Package,
    //   color: 'bg-green-500',
    // },
    // {
    //   name: 'Chiffre d\'affaires',
    //   value: '12,450 €',
    //   icon: TrendingUp,
    //   color: 'bg-purple-500',
    // },
    // {
    //   name: 'Partenaires',
    //   value: '42',
    //   icon: Users,
    //   color: 'bg-orange-500',
    // },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Bienvenue, {user?.companyName}
        </h1>
        <p className="text-gray-600">
          {user?.role === "GARAGE"
            ? "Gérez vos commandes de pièces automobiles"
            : "Gérez votre catalogue et vos commandes"}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Actions rapides
          </h2>
          <div className="space-y-3">
            <Link
              href="/parts"
              className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Package className="h-5 w-5 text-primary-600 mr-3" />
              <span className="font-medium text-gray-700">
                {user?.role === "GARAGE"
                  ? "Rechercher des pièces"
                  : "Gérer mon catalogue"}
              </span>
            </Link>
            <Link
              href="/orders"
              className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ShoppingCart className="h-5 w-5 text-primary-600 mr-3" />
              <span className="font-medium text-gray-700">
                {user?.role === "GARAGE"
                  ? "Voir mes commandes"
                  : "Gérer les commandes reçues"}
              </span>
            </Link>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Commandes récentes
          </h2>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : recentOrders.length > 0 ? (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.orderId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {order.orderId.slice(0, 8)}...
                    </p>
                    <p className="text-sm text-gray-500">
                      {order.lines.length} article(s)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {order.totalFormatted}
                    </p>
                    <span className={`badge-${order.status.toLowerCase()}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              Aucune commande récente
            </p>
          )}
        </div>
      </div>

      {/* Top Suppliers - Only for GARAGE users */}
      {user?.role === "GARAGE" && (
        <div className="card">
          <div className="flex items-center mb-4">
            <TrendingUp className="h-5 w-5 text-primary-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">
              Mes meilleurs fournisseurs
            </h2>
          </div>
          {isSuppliersLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : topSuppliers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fournisseur
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commandes
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total dépensé
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {topSuppliers.map((supplier, index) => (
                    <tr key={supplier.supplierId} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-600">
                              {index + 1}
                            </span>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">
                              {supplier.companyName}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                        {supplier.orderCount}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                        {supplier.totalSpent.toLocaleString("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              Aucune donnée de fournisseur disponible
            </p>
          )}
        </div>
      )}
    </div>
  );
}
