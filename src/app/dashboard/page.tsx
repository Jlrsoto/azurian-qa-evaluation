'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Building2,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Filter,
  Info,
  Loader2,
  LogOut,
  Pencil,
  PlusCircle,
  RefreshCw,
  Search,
  Send,
  Shield,
  Trash2,
  X,
} from 'lucide-react';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import DocumentDetailDialog from '@/components/DocumentDetailDialog';
import DocumentFormModal from '@/components/DocumentFormModal';
import StatusBadge, { statusLabel } from '@/components/StatusBadge';
import SummaryCards from '@/components/SummaryCards';
import {
  apiFetch,
  clearSession,
  errorMessage,
  getStoredUser,
  getToken,
  isAbortError,
  isSessionError,
} from '@/lib/client';
import type { AuthUserDTO, DocumentDTE, DocumentSummary } from '@/lib/types';

const PAGE_SIZE = 10;
const LOCKED_HINT = 'Un documento aceptado no puede modificarse ni eliminarse.';
const SEND_HINT = 'Solo los documentos pendientes pueden enviarse al SII.';

interface Filters {
  rut: string;
  tipoDte: string;
  estado: string;
}

const NO_FILTERS: Filters = { rut: '', tipoDte: 'TODOS', estado: 'TODOS' };

type DialogState =
  | { kind: 'create' }
  | { kind: 'edit'; id: string }
  | { kind: 'detail'; id: string }
  | { kind: 'delete'; document: DocumentDTE }
  | null;

interface Notice {
  tone: 'success' | 'warning';
  text: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUserDTO | null>(null);

  const [documents, setDocuments] = useState<DocumentDTE[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<DocumentSummary | null>(null);

  const [rutInput, setRutInput] = useState('');
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [page, setPage] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setUser(getStoredUser());
    setReady(true);
  }, [router]);

  // Listado: se vuelve a consultar al cambiar filtros, página o al pedir recarga.
  // Cada consulta cancela la anterior para que una respuesta lenta no pise a una más reciente.
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();

    const query = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (filters.rut) query.set('rut', filters.rut);
    if (filters.tipoDte !== 'TODOS') query.set('tipoDte', filters.tipoDte);
    if (filters.estado !== 'TODOS') query.set('estado', filters.estado);

    setIsLoading(true);
    setErrorText(null);

    (async () => {
      try {
        const { data, headers } = await apiFetch<DocumentDTE[]>(`/api/documents?${query.toString()}`, {
          signal: controller.signal,
        });
        const count = Number(headers.get('x-total-count') ?? data.length);
        const lastPage = Math.max(1, Math.ceil(count / PAGE_SIZE));

        if (page > lastPage) {
          setPage(lastPage);
          return;
        }

        setDocuments(data);
        setTotal(count);
        setIsLoading(false);
      } catch (caught) {
        if (isAbortError(caught) || isSessionError(caught)) return;
        setDocuments([]);
        setTotal(0);
        setErrorText(errorMessage(caught, 'No fue posible consultar los documentos.'));
        setIsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [ready, filters, page, reloadToken]);

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();

    (async () => {
      try {
        const { data } = await apiFetch<DocumentSummary>('/api/documents/summary', { signal: controller.signal });
        setSummary(data);
      } catch {
        // El resumen es informativo: si falla se conserva el último valor conocido.
      }
    })();

    return () => controller.abort();
  }, [ready, reloadToken]);

  const refresh = () => setReloadToken((token) => token + 1);

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFilters((current) => ({ ...current, rut: rutInput.trim() }));
    setPage(1);
  };

  const handleTipoDteChange = (tipoDte: string) => {
    setFilters((current) => ({ ...current, tipoDte }));
    setPage(1);
  };

  const handleEstadoChange = (estado: string) => {
    setFilters((current) => ({ ...current, estado }));
    setPage(1);
  };

  const handleResetFilters = () => {
    setRutInput('');
    setFilters(NO_FILTERS);
    setPage(1);
    refresh();
  };

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  };

  const handleSaved = (text: string) => {
    setDialog(null);
    setActionError(null);
    setNotice({ tone: 'success', text });
    refresh();
  };

  const handleSend = async (target: DocumentDTE) => {
    setSendingId(target.id);
    setNotice(null);
    setActionError(null);

    try {
      const { data } = await apiFetch<DocumentDTE>(`/api/documents/${encodeURIComponent(target.id)}/send`, {
        method: 'POST',
      });
      setNotice(
        data.estado === 'ACEPTADO'
          ? { tone: 'success', text: `Documento folio ${data.folio} enviado al SII. Resultado: ${statusLabel(data.estado)}.` }
          : { tone: 'warning', text: `Documento folio ${data.folio} enviado al SII. Resultado: ${statusLabel(data.estado)}. Corrige el documento para reenviarlo.` }
      );
    } catch (caught) {
      if (isSessionError(caught)) return;
      setActionError(errorMessage(caught, 'No fue posible enviar el documento al SII.'));
    } finally {
      setSendingId(null);
      refresh();
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);
  const isBusy = sendingId !== null;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col">
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-wide block leading-none">Azurian</span>
              <span className="text-xs text-blue-300 font-medium">Laboratorio de documentos</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <span className="block text-sm font-semibold text-slate-200">
                Bienvenido, {user?.name || 'Administrador Azurian'}
              </span>
              <span className="block text-xs text-slate-400">{user?.email || 'admin@azurian.com'}</span>
            </div>
            <button
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              className="flex items-center gap-2 bg-slate-800 hover:bg-red-600 text-slate-200 hover:text-white px-3.5 py-2 rounded-xl text-sm font-medium transition duration-200 border border-slate-700"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-600" />
              Documentos Tributarios Electrónicos
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Consulta, filtra, emite, corrige y elimina documentos en una ejecución aislada del laboratorio.
            </p>
          </div>
          <button
            onClick={() => setDialog({ kind: 'create' })}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-xl shadow-md transition duration-150 text-sm shrink-0"
          >
            <PlusCircle className="w-5 h-5" />
            Nuevo documento
          </button>
        </div>

        <details className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 text-sm text-slate-700">
          <summary className="cursor-pointer font-semibold text-blue-900">Reglas del laboratorio de automatización</summary>
          <div className="grid gap-5 md:grid-cols-2 pt-4">
            <section aria-labelledby="allowed-rules-title">
              <h2 id="allowed-rules-title" className="font-semibold text-emerald-800 mb-2">Permitido y esperado</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Locators por rol, label, texto visible o relación semántica de tabla.</li>
                <li>Expectativas, auto-wait de Playwright y espera de respuestas o estados visibles.</li>
                <li>Datos únicos por ejecución y escenarios API → UI.</li>
              </ul>
            </section>
            <section aria-labelledby="forbidden-rules-title">
              <h2 id="forbidden-rules-title" className="font-semibold text-red-800 mb-2">No válido para la evaluación</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Pausas fijas: <code>waitForTimeout</code>, <code>sleep</code> o equivalentes.</li>
                <li>XPath absoluto, clases de estilo, IDs internos o posiciones globales como locator.</li>
                <li>Modificar base de datos, latencias, datos semilla o datos de otra ejecución.</li>
              </ul>
            </section>
          </div>
        </details>

        <SummaryCards summary={summary} />

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col lg:flex-row items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-1 w-full lg:w-auto items-center gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Buscar por RUT Receptor (ej. 76.192.584-9)..."
                aria-label="Buscar por RUT Receptor"
                value={rutInput}
                onChange={(event) => setRutInput(event.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-800"
              />
            </div>
            <button
              type="submit"
              className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-1.5 transition"
            >
              Buscar
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
            <div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
              <Filter className="w-4 h-4 text-slate-400" />
              <label htmlFor="filter-tipo-dte" className="sr-only sm:not-sr-only">Tipo DTE:</label>
            </div>
            <select
              id="filter-tipo-dte"
              value={filters.tipoDte}
              onChange={(event) => handleTipoDteChange(event.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
            >
              <option value="TODOS">Todos los tipos</option>
              <option value="DTE 33">DTE 33 - Factura Electrónica</option>
              <option value="DTE 34">DTE 34 - Factura Exenta</option>
              <option value="DTE 39">DTE 39 - Boleta Electrónica</option>
            </select>

            <label htmlFor="filter-estado" className="sr-only sm:not-sr-only text-slate-600 text-sm font-medium">Estado:</label>
            <select
              id="filter-estado"
              value={filters.estado}
              onChange={(event) => handleEstadoChange(event.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="ACEPTADO">Aceptado</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="RECHAZADO">Rechazado</option>
            </select>

            <button
              onClick={handleResetFilters}
              aria-label="Recargar tabla"
              title="Recargar tabla"
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {notice && (
          <div
            role="status"
            className={`p-4 rounded-xl text-sm flex items-start justify-between gap-3 border ${
              notice.tone === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <span className="flex items-start gap-2">
              {notice.tone === 'success' ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <Info className="w-4 h-4 mt-0.5 shrink-0" />}
              <span>{notice.text}</span>
            </span>
            <button onClick={() => setNotice(null)} aria-label="Cerrar mensaje" className="shrink-0 p-0.5 rounded hover:bg-black/5">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {actionError && (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm flex items-start justify-between gap-3">
            <span className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{actionError}</span>
            </span>
            <button onClick={() => setActionError(null)} aria-label="Cerrar error" className="shrink-0 p-0.5 rounded hover:bg-black/5">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {errorText && (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
            {errorText}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative min-h-[340px]">
          {isLoading && (
            <div
              role="status"
              aria-live="polite"
              aria-label="Cargando documentos"
              className="absolute inset-0 bg-white/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 space-y-4"
            >
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              <div className="text-center">
                <span className="text-base font-semibold text-slate-800 block">Procesando consulta de documentos DTE...</span>
                <span className="text-xs text-slate-500">La respuesta del servidor tiene latencia variable.</span>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            {!isLoading && (
              <p aria-live="polite" className="px-6 pt-4 text-xs text-slate-500">
                {total} {total === 1 ? 'documento encontrado' : 'documentos encontrados'}
              </p>
            )}
            <table aria-label="Tabla de Documentos Tributarios" className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-slate-300 text-xs font-semibold uppercase tracking-wider">
                  <th scope="col" className="py-4 px-6">Folio</th>
                  <th scope="col" className="py-4 px-6">Tipo DTE</th>
                  <th scope="col" className="py-4 px-6">RUT Receptor</th>
                  <th scope="col" className="py-4 px-6">Monto Total</th>
                  <th scope="col" className="py-4 px-6">Fecha Emisión</th>
                  <th scope="col" className="py-4 px-6">Estado</th>
                  <th scope="col" className="py-4 px-6 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <span>No se encontraron documentos DTE para los criterios seleccionados.</span>
                    </td>
                  </tr>
                ) : (
                  documents.map((document) => {
                    const isLocked = document.estado === 'ACEPTADO';
                    const canSend = document.estado === 'PENDIENTE';
                    const isSending = sendingId === document.id;

                    return (
                      <tr key={document.id} className="hover:bg-slate-50/80 transition duration-150">
                        <td className="py-4 px-6 font-mono font-semibold text-slate-900">#{document.folio}</td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200">
                            {document.tipoDte}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-mono text-slate-700">{document.rutReceptor}</td>
                        <td className="py-4 px-6 font-semibold text-slate-900">$ {document.monto.toLocaleString('es-CL')} CLP</td>
                        <td className="py-4 px-6 text-slate-500 text-xs">{document.fechaEmision}</td>
                        <td className="py-4 px-6">
                          <StatusBadge status={document.estado} />
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-wrap items-center justify-center gap-1.5">
                            <button
                              onClick={() => setDialog({ kind: 'detail', id: document.id })}
                              aria-label={`Ver detalle de folio ${document.folio}`}
                              className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition"
                            >
                              <Eye className="w-3.5 h-3.5" /> Ver detalle
                            </button>
                            <button
                              onClick={() => setDialog({ kind: 'edit', id: document.id })}
                              disabled={isLocked || isBusy}
                              title={isLocked ? LOCKED_HINT : undefined}
                              aria-label={`Editar folio ${document.folio}`}
                              className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Pencil className="w-3.5 h-3.5" /> Editar
                            </button>
                            <button
                              onClick={() => handleSend(document)}
                              disabled={!canSend || isBusy}
                              title={!canSend ? SEND_HINT : undefined}
                              aria-label={`Enviar al SII folio ${document.folio}`}
                              className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                              {isSending ? 'Enviando...' : 'Enviar al SII'}
                            </button>
                            <button
                              onClick={() => setDialog({ kind: 'delete', document })}
                              disabled={isLocked || isBusy}
                              title={isLocked ? LOCKED_HINT : undefined}
                              aria-label={`Eliminar folio ${document.folio}`}
                              className="inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {total > 0 && (
            <nav
              aria-label="Paginación de documentos"
              className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 text-sm text-slate-600"
            >
              <p>
                Mostrando {rangeStart}–{rangeEnd} de {total} · Página {page} de {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((current) => current - 1)}
                  disabled={page <= 1 || isLoading}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" /> Anterior
                </button>
                <button
                  onClick={() => setPage((current) => current + 1)}
                  disabled={page >= totalPages || isLoading}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Siguiente <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </nav>
          )}
        </div>
      </main>

      {dialog?.kind === 'create' && <DocumentFormModal onClose={() => setDialog(null)} onSaved={handleSaved} />}
      {dialog?.kind === 'edit' && (
        <DocumentFormModal documentId={dialog.id} onClose={() => setDialog(null)} onSaved={handleSaved} />
      )}
      {dialog?.kind === 'detail' && <DocumentDetailDialog documentId={dialog.id} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'delete' && (
        <ConfirmDeleteDialog target={dialog.document} onClose={() => setDialog(null)} onDeleted={handleSaved} />
      )}
    </div>
  );
}
