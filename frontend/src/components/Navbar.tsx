'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, ShoppingCart, LogOut, User, LayoutDashboard } from 'lucide-react';
import { useAuthStore } from '@/lib/store';

export function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <Package className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">AutoParts B2B</span>
            </Link>

            <div className="hidden md:flex ml-10 space-x-4">
              <Link
                href="/dashboard"
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary-600"
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
              <Link
                href="/parts"
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary-600"
              >
                <Package className="h-4 w-4 mr-2" />
                Catalogue
              </Link>
              <Link
                href="/orders"
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary-600"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Commandes
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <User className="h-4 w-4" />
              <span>{user?.companyName}</span>
              <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs">
                {user?.role}
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
