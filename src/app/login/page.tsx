'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, Mail, AlertCircle, Loader2, CheckCircle2, Info } from 'lucide-react';
import { saveSession } from '@/lib/client';
import type { ApiErrorBody, AuthUserDTO } from '@/lib/types';

interface LoginFieldErrors {
  email?: string;
  password?: string;
}

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    setSessionExpired(new URLSearchParams(window.location.search).get('expired') === '1');
  }, []);

  const validate = (): LoginFieldErrors => {
    const errors: LoginFieldErrors = {};
    if (!email.trim()) errors.email = 'El correo es obligatorio.';
    else if (!EMAIL_FORMAT.test(email.trim())) errors.email = 'Ingresa un correo electrónico válido.';
    if (!password) errors.password = 'La contraseña es obligatoria.';
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const errors = validate();
    setFieldErrors(errors);
    if (errors.email || errors.password) {
      document.getElementById(errors.email ? 'input-user' : 'input-pass')?.focus();
      return;
    }

    setIsLoading(true);
    setSessionExpired(false);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (res.ok) {
        saveSession(data.token as string, data.user as AuthUserDTO);
        router.push('/dashboard');
      } else {
        setErrorMessage((data as ApiErrorBody).error || 'Credenciales inválidas.');
      }
    } catch {
      setErrorMessage('Error al conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    'block w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition aria-[invalid=true]:border-red-500';

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
          {sessionExpired && !errorMessage && (
            <div
              role="alert"
              className="mb-6 bg-amber-950/60 border border-amber-500/50 p-4 rounded-xl flex items-start gap-3 text-amber-200 text-sm"
            >
              <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <span>Tu sesión expiró o no es válida. Inicia sesión nuevamente.</span>
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              aria-live="assertive"
              className="mb-6 bg-red-950/80 border border-red-500/50 p-4 rounded-xl flex items-start gap-3 text-red-200 text-sm"
            >
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Error de Autenticación</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-6">
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
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFieldErrors((current) => ({ ...current, email: undefined }));
                  }}
                  placeholder="admin@azurian.com"
                  aria-label="Usuario o Correo Electrónico"
                  aria-invalid={fieldErrors.email ? true : undefined}
                  aria-describedby={fieldErrors.email ? 'error-email' : undefined}
                  aria-errormessage={fieldErrors.email ? 'error-email' : undefined}
                  className={inputClass}
                />
              </div>
              {fieldErrors.email && (
                <p id="error-email" className="mt-1 text-xs text-red-400">{fieldErrors.email}</p>
              )}
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
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldErrors((current) => ({ ...current, password: undefined }));
                  }}
                  placeholder="••••••••"
                  aria-label="Contraseña"
                  aria-invalid={fieldErrors.password ? true : undefined}
                  aria-describedby={fieldErrors.password ? 'error-password' : undefined}
                  aria-errormessage={fieldErrors.password ? 'error-password' : undefined}
                  className={inputClass}
                />
              </div>
              {fieldErrors.password && (
                <p id="error-password" className="mt-1 text-xs text-red-400">{fieldErrors.password}</p>
              )}
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
