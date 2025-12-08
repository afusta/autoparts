'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Package,
  ShoppingCart,
  Car,
  TrendingUp,
  Building,
  BarChart3,
  Activity,
} from 'lucide-react';
import { analyticsApi, GraphStats } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Redirect non-admin users
    if (user && user.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }

    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const response = await analyticsApi.getGraphStats();
        setStats(response.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load analytics');
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.role === 'ADMIN') {
      fetchStats();
    }
  }, [user, router]);

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary mt-4"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const statCards = [
    {
      name: 'Utilisateurs',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'bg-blue-500',
      description: 'Total des comptes',
    },
    {
      name: 'Pièces',
      value: stats?.totalParts || 0,
      icon: Package,
      color: 'bg-green-500',
      description: 'Pièces au catalogue',
    },
    {
      name: 'Commandes',
      value: stats?.totalOrders || 0,
      icon: ShoppingCart,
      color: 'bg-purple-500',
      description: 'Commandes totales',
    },
    {
      name: 'Véhicules',
      value: stats?.totalVehicles || 0,
      icon: Car,
      color: 'bg-orange-500',
      description: 'Véhicules référencés',
    },
  ];

  const roleStats = stats?.usersByRole || {};

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 bg-primary-100 rounded-lg">
            <BarChart3 className="h-6 w-6 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
        </div>
        <p className="text-gray-600">
          Vue d&apos;ensemble de la plateforme AutoParts B2B
        </p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
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
            <p className="text-xs text-gray-400 mt-2">{stat.description}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users by Role */}
        <div className="card">
          <div className="flex items-center space-x-2 mb-6">
            <Users className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold">Répartition des utilisateurs</h2>
          </div>

          <div className="space-y-4">
            {/* Garages */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700">Garages</span>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {roleStats['GARAGE'] || 0}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      stats?.totalUsers
                        ? ((roleStats['GARAGE'] || 0) / stats.totalUsers) * 100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Suppliers */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-gray-700">Fournisseurs</span>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {roleStats['SUPPLIER'] || 0}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      stats?.totalUsers
                        ? ((roleStats['SUPPLIER'] || 0) / stats.totalUsers) * 100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Admins */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium text-gray-700">Administrateurs</span>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {roleStats['ADMIN'] || 0}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      stats?.totalUsers
                        ? ((roleStats['ADMIN'] || 0) / stats.totalUsers) * 100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Overview */}
        <div className="card">
          <div className="flex items-center space-x-2 mb-6">
            <TrendingUp className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold">Aperçu de la plateforme</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Utilisateurs actifs</p>
                  <p className="text-sm text-gray-500">Total des comptes créés</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-blue-600">
                {stats?.totalUsers || 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Package className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Catalogue</p>
                  <p className="text-sm text-gray-500">Pièces disponibles</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-green-600">
                {stats?.totalParts || 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ShoppingCart className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Transactions</p>
                  <p className="text-sm text-gray-500">Commandes traitées</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-purple-600">
                {stats?.totalOrders || 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Car className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Compatibilité</p>
                  <p className="text-sm text-gray-500">Véhicules supportés</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-orange-600">
                {stats?.totalVehicles || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Graph Info Card */}
      <div className="card mt-6">
        <div className="flex items-center space-x-2 mb-4">
          <Activity className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold">Base de données Graph (Neo4j)</h2>
        </div>
        <p className="text-gray-600 text-sm mb-4">
          Ces statistiques proviennent de la base de données graph Neo4j, qui modélise
          les relations entre les garages, les fournisseurs, les pièces et les véhicules.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{stats?.totalUsers || 0}</p>
            <p className="text-xs text-gray-500">Noeuds Utilisateurs</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{stats?.totalParts || 0}</p>
            <p className="text-xs text-gray-500">Noeuds Pièces</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{stats?.totalOrders || 0}</p>
            <p className="text-xs text-gray-500">Noeuds Commandes</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{stats?.totalVehicles || 0}</p>
            <p className="text-xs text-gray-500">Noeuds Véhicules</p>
          </div>
        </div>
      </div>
    </div>
  );
}
