'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Package,
  ShoppingCart,
  LogOut,
  User,
  LayoutDashboard,
  BarChart3,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const isActive = (path: string) => pathname === path;

  const linkClass = (path: string) =>
    `flex items-center px-3 py-2 text-sm font-medium transition-colors ${
      isActive(path)
        ? 'text-primary-600 bg-primary-50 rounded-lg'
        : 'text-gray-600 hover:text-primary-600'
    }`;

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <Package className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">AutoParts B2B</span>
            </Link>

            <div className="hidden md:flex ml-10 space-x-2">
              <Link href="/dashboard" className={linkClass('/dashboard')}>
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
              <Link href="/parts" className={linkClass('/parts')}>
                <Package className="h-4 w-4 mr-2" />
                Catalogue
              </Link>
              <Link href="/orders" className={linkClass('/orders')}>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Commandes
              </Link>
              {user?.role === 'ADMIN' && (
                <Link href="/admin" className={linkClass('/admin')}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Administration
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <User className="h-4 w-4" />
              <span>{user?.companyName}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
                  user?.role === 'ADMIN'
                    ? 'bg-purple-100 text-purple-700'
                    : user?.role === 'SUPPLIER'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-primary-100 text-primary-700'
                }`}
              >
                {user?.role === 'ADMIN'
                  ? 'Admin'
                  : user?.role === 'SUPPLIER'
                  ? 'Fournisseur'
                  : 'Garage'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-red-600"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
