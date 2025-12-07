'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Package, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/store';

interface LoginForm {
  email: string;
  password: string;
}

interface RegisterForm {
  email: string;
  password: string;
  companyName: string;
  role: 'GARAGE' | 'SUPPLIER';
}

export default function LoginPage() {
  const router = useRouter();
  const { login, register: registerUser } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const loginForm = useForm<LoginForm>();
  const registerForm = useForm<RegisterForm>({ defaultValues: { role: 'GARAGE' } });

  const handleLogin = async (data: LoginForm) => {
    setIsLoading(true);
    setError('');
    try {
      await login(data.email, data.password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (data: RegisterForm) => {
    setIsLoading(true);
    setError('');
    try {
      await registerUser(data.email, data.password, data.companyName, data.role);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur d\'inscription');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Package className="h-16 w-16 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">AutoParts B2B</h1>
          <p className="mt-2 text-gray-600">
            Plateforme de commande de pièces automobiles
          </p>
        </div>

        <div className="card">
          <div className="flex mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-center font-medium border-b-2 transition-colors ${
                isLogin
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Connexion
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-center font-medium border-b-2 transition-colors ${
                !isLogin
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Inscription
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {isLogin ? (
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  {...loginForm.register('email', { required: true })}
                  className="input"
                  placeholder="email@exemple.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe
                </label>
                <input
                  type="password"
                  {...loginForm.register('password', { required: true })}
                  className="input"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary flex items-center justify-center"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Se connecter'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l&apos;entreprise
                </label>
                <input
                  type="text"
                  {...registerForm.register('companyName', { required: true })}
                  className="input"
                  placeholder="Ma Société SARL"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  {...registerForm.register('email', { required: true })}
                  className="input"
                  placeholder="email@exemple.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe
                </label>
                <input
                  type="password"
                  {...registerForm.register('password', { required: true, minLength: 8 })}
                  className="input"
                  placeholder="8 caractères minimum"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de compte
                </label>
                <select {...registerForm.register('role')} className="input">
                  <option value="GARAGE">Garage (Acheteur)</option>
                  <option value="SUPPLIER">Fournisseur (Vendeur)</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary flex items-center justify-center"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Créer mon compte'
                )}
              </button>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          Demo: Clean Architecture + DDD + CQRS
        </p>
      </div>
    </div>
  );
}
