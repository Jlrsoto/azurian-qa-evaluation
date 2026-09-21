'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  LogOut,
  Search,
  PlusCircle,
  FileText,
  Filter,
  Loader2,
  RefreshCw,
  Eye,
  CheckCircle,
  Clock,
  Building2,
} from 'lucide-react';
import NewDocumentModal from '@/components/NewDocumentModal';

interface DocumentDTE {
  id: string;
  tipoDte: string;
  folio: number;
  rutReceptor: string;
  monto: number;
  fechaEmision: string;
  estado: 'ACEPTADO' | 'PENDIENTE' | 'RECHAZADO';
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [documents, setDocuments] = useState<DocumentDTE[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<DocumentDTE[]>([]);
  const [searchRut, setSearchRut] = useState('');
  const [selectedTipoDte, setSelectedTipoDte] = useState('TODOS');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDocDetail, setSelectedDocDetail] = useState<DocumentDTE | null>(null);

  // Verificar autenticación
  useEffect(() => {
    const token = localStorage.getItem('azurian_token');
    const storedUser = localStorage.getItem('azurian_user');

    if (!token) {
      router.push('/login');
      return;
    }

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        setUser({ name: 'Administrador Azurian', email: 'admin@azurian.com' });
      }
    }
  }, [router]);

  // Carga de documentos con retardo asíncrono deliberado (1.8 a 2.5s)
  const fetchDocuments = useCallback(async (rutQuery = '') => {
    setIsLoading(true);

    // Retardo aleatorio dentro del rango de 1800ms a 2500ms
    const delay = Math.floor(Math.random() * (2500 - 1800 + 1)) + 1800;
    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      const url = rutQuery
        ? `/api/documents?rut=${encodeURIComponent(rutQuery)}`
        : '/api/documents';
      const res = await fetch(url);
      const data = await res.json();
      setDocuments(data);
    } catch (err) {
      console.error('Error al obtener los documentos:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Aplicar filtros locales de tipo DTE
  useEffect(() => {
    let result = [...documents];
    if (selectedTipoDte !== 'TODOS') {
      result = result.filter((d) => d.tipoDte === selectedTipoDte);
    }
    setFilteredDocs(result);
  }, [documents, selectedTipoDte]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDocuments(searchRut);
  };

  const handleLogout = () => {
    localStorage.removeItem('azurian_token');
    localStorage.removeItem('azurian_user');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col">
      {/* HEADER PRINCIPAL */}
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-wide block leading-none">
                Azurian
              </span>
              <span className="text-xs text-blue-300 font-medium">
                Portal de Gestión de Documentos
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <span
                id="user-welcome-label"
                className="block text-sm font-semibold text-slate-200"
              >
                Bienvenido, {user?.name || 'Administrador Azurian'}
              </span>
              <span className="block text-xs text-slate-400">
                {user?.email || 'admin@azurian.com'}
              </span>
            </div>

            <button
              id={`btn-logout-${Math.random().toString(36).substring(2, 6)}`}
              onClick={handleLogout}
              role="button"
              aria-label="Cerrar Sesión"
              className="flex items-center gap-2 bg-slate-800 hover:bg-red-600 text-slate-200 hover:text-white px-3.5 py-2 rounded-xl text-sm font-medium transition duration-200 border border-slate-700"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* TITULO Y ACCION */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-600" />
              Documentos Tributarios Electrónicos (DTE)
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Consulta, filtra y emite facturas y boletas electrónicas registradas en la plataforma.
            </p>
          </div>

          <button
            id={`btn-new-doc-${Math.random().toString(36).substring(2, 6)}`}
            onClick={() => setIsModalOpen(true)}
            role="button"
            aria-label="Nuevo Documento"
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-xl shadow-md transition duration-150 text-sm shrink-0"
          >
            <PlusCircle className="w-5 h-5" />
            Nuevo Documento
          </button>
        </div>

        {/* BARRA DE HERRAMIENTAS Y FILTROS */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-1 w-full md:w-auto items-center gap-3"
          >
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                id={`input-search-rut-${Math.random().toString(36).substring(2, 6)}`}
                type="text"
                placeholder="Buscar por RUT Receptor (ej. 76.192.584-9)..."
                aria-label="Buscar por RUT Receptor"
                value={searchRut}
                onChange={(e) => setSearchRut(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-800"
              />
            </div>

            <button
              type="submit"
              role="button"
              aria-label="Buscar por RUT"
              className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-1.5 transition"
            >
              Buscar
            </button>
          </form>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
              <Filter className="w-4 h-4 text-slate-400" />
              <label htmlFor="filter-tipo-dte" className="sr-only sm:not-sr-only">
                Tipo DTE:
              </label>
            </div>
            <select
              id="filter-tipo-dte"
              aria-label="Filtrar por Tipo de DTE"
              value={selectedTipoDte}
              onChange={(e) => setSelectedTipoDte(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
            >
              <option value="TODOS">Todos los tipos</option>
              <option value="DTE 33">DTE 33 - Factura Electrónica</option>
              <option value="DTE 34">DTE 34 - Factura Exenta</option>
              <option value="DTE 39">DTE 39 - Boleta Electrónica</option>
            </select>

            <button
              onClick={() => {
                setSearchRut('');
                setSelectedTipoDte('TODOS');
                fetchDocuments('');
              }}
              aria-label="Recargar tabla"
              title="Recargar tabla"
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TABLA DE DOCUMENTOS CON ASINCRONIA DELIBERADA */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative min-h-[340px]">
          {isLoading ? (
            <div
              id="spinner-loading-container"
              role="status"
              aria-live="polite"
              aria-label="Cargando documentos..."
              className="absolute inset-0 bg-white/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 space-y-4"
            >
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              <div className="text-center">
                <span className="text-base font-semibold text-slate-800 block">
                  Procesando consulta de documentos DTE...
                </span>
                <span className="text-xs text-slate-500">
                  Respondiendo a la llamada asíncrona del servidor
                </span>
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table
              id={`table-documents-${Math.random().toString(36).substring(2, 6)}`}
              aria-label="Tabla de Documentos Tributarios"
              className="w-full text-left border-collapse"
            >
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
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <span>No se encontraron documentos DTE para los criterios seleccionados.</span>
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map((doc) => {
                    const rowId = `row-doc-${Math.random().toString(36).substring(2, 6)}`;
                    return (
                      <tr
                        key={doc.id}
                        id={rowId}
                        className="hover:bg-slate-50/80 transition duration-150"
                      >
                        <td className="py-4 px-6 font-mono font-semibold text-slate-900">
                          #{doc.folio}
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200">
                            {doc.tipoDte}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-mono text-slate-700">
                          {doc.rutReceptor}
                        </td>
                        <td className="py-4 px-6 font-semibold text-slate-900">
                          $ {doc.monto.toLocaleString('es-CL')} CLP
                        </td>
                        <td className="py-4 px-6 text-slate-500 text-xs">
                          {doc.fechaEmision}
                        </td>
                        <td className="py-4 px-6">
                          {doc.estado === 'ACEPTADO' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              Aceptado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              Pendiente
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => setSelectedDocDetail(doc)}
                            role="button"
                            aria-label={`Ver detalle de folio ${doc.folio}`}
                            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Ver Detalle
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL PARA DETALLE DE DOCUMENTO */}
      {selectedDocDetail && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-modal-title"
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <h3 id="detail-modal-title" className="text-lg font-bold text-slate-900">
              Detalle DTE - Folio #{selectedDocDetail.folio}
            </h3>
            <div className="space-y-2 text-sm text-slate-600 bg-slate-50 p-4 rounded-xl">
              <p><span className="font-semibold text-slate-800">Tipo:</span> {selectedDocDetail.tipoDte}</p>
              <p><span className="font-semibold text-slate-800">RUT Receptor:</span> {selectedDocDetail.rutReceptor}</p>
              <p><span className="font-semibold text-slate-800">Monto:</span> $ {selectedDocDetail.monto.toLocaleString('es-CL')} CLP</p>
              <p><span className="font-semibold text-slate-800">Fecha Emisión:</span> {selectedDocDetail.fechaEmision}</p>
              <p><span className="font-semibold text-slate-800">Estado:</span> {selectedDocDetail.estado}</p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setSelectedDocDetail(null)}
                className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-800 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA CREAR NUEVO DOCUMENTO */}
      <NewDocumentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDocumentCreated={() => fetchDocuments(searchRut)}
      />
    </div>
  );
}
