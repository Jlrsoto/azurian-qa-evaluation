'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, Mail, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('azurian_token', data.token);
        localStorage.setItem('azurian_user', JSON.stringify(data.user));
        router.push('/dashboard');
      } else {
        setErrorMessage(data.error || 'Credenciales inválidas.');
      }
    } catch (err) {
      setErrorMessage('Error al conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-3">
          <div className="bg-blue-600 p-3 rounded-xl shadow-lg text-white">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-wide">Azurian</h1>
            <p className="text-xs text-blue-300 font-medium">Document Management Portal</p>
          </div>
        </div>
        <h2 className="mt-6 text-center text-xl font-semibold text-slate-200">
          Portal de Gestión de Documentos
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Entorno de Evaluación Técnica de QA Automation
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800/90 backdrop-blur border border-slate-700/60 py-8 px-4 shadow-2xl rounded-2xl sm:px-10">
          {errorMessage && (
            <div
              role="alert"
              aria-live="assertive"
              className="mb-6 bg-red-950/80 border border-red-500/50 p-4 rounded-xl flex items-start gap-3 text-red-200 text-sm animate-fadeIn"
            >
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Error de Autenticación</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="input-user"
                className="block text-sm font-medium text-slate-300 mb-1"
              >
                Usuario / Correo Electrónico
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  id="input-user"
                  name="username"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@azurian.com"
                  aria-label="Usuario o Correo Electrónico"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="input-pass"
                className="block text-sm font-medium text-slate-300 mb-1"
              >
                Contraseña
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="input-pass"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  aria-label="Contraseña"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                aria-label="Iniciar Sesión"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Autenticando...
                  </>
                ) : (
                  'Iniciar Sesión'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700/60">
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3.5 text-xs text-slate-400">
              <div className="font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Credenciales de Prueba QA:
              </div>
              <p><span className="text-slate-300 font-mono">Usuario:</span> admin@azurian.com</p>
              <p><span className="text-slate-300 font-mono">Contraseña:</span> Azurian2026!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
