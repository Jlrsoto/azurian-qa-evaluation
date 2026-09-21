'use client';

import { useState } from 'react';
import { X, FilePlus, Loader2, AlertCircle } from 'lucide-react';

interface NewDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentCreated: () => void;
}

export default function NewDocumentModal({
  isOpen,
  onClose,
  onDocumentCreated,
}: NewDocumentModalProps) {
  const [tipoDte, setTipoDte] = useState('DTE 33');
  const [folio, setFolio] = useState('');
  const [rutReceptor, setRutReceptor] = useState('');
  const [monto, setMonto] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!folio || !rutReceptor || !monto) {
      setErrorMsg('Todos los campos son obligatorios.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoDte,
          folio: Number(folio),
          rutReceptor,
          monto: Number(monto),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Limpiar formulario y cerrar
        setFolio('');
        setRutReceptor('');
        setMonto('');
        onClose();
        onDocumentCreated();
      } else {
        setErrorMsg(data.error || 'Error al emitir el documento DTE.');
      }
    } catch (err) {
      setErrorMsg('Error de red al intentar comunicarse con el API.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden transform transition-all">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-600 p-2 rounded-lg">
              <FilePlus className="w-5 h-5" />
            </div>
            <h2 id="modal-title" className="text-lg font-bold">
              Emitir Nuevo Documento (DTE)
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl flex items-center gap-2 text-sm"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="select-tipo-dte"
              className="block text-sm font-semibold text-slate-700 mb-1"
            >
              Tipo de Documento Tributario (DTE)
            </label>
            <select
              id="select-tipo-dte"
              aria-label="Tipo de Documento Tributario"
              value={tipoDte}
              onChange={(e) => setTipoDte(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="DTE 33">DTE 33 - Factura Electrónica</option>
              <option value="DTE 34">DTE 34 - Factura Non Afecta / Exenta</option>
              <option value="DTE 39">DTE 39 - Boleta Electrónica</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="input-folio"
                className="block text-sm font-semibold text-slate-700 mb-1"
              >
                Número de Folio
              </label>
              <input
                id="input-folio"
                type="number"
                placeholder="Ej. 1004"
                aria-label="Número de Folio"
                value={folio}
                onChange={(e) => setFolio(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label
                htmlFor="input-rut-receptor"
                className="block text-sm font-semibold text-slate-700 mb-1"
              >
                RUT Receptor
              </label>
              <input
                id="input-rut-receptor"
                type="text"
                placeholder="Ej. 77.341.920-5"
                aria-label="RUT Receptor"
                value={rutReceptor}
                onChange={(e) => setRutReceptor(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="input-monto"
              className="block text-sm font-semibold text-slate-700 mb-1"
            >
              Monto Total ($ CLP)
            </label>
            <input
              id="input-monto"
              type="number"
              placeholder="Ej. 250000"
              aria-label="Monto Total"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              role="button"
              aria-label="Emitir Documento"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-md transition"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Emitiendo...
                </>
              ) : (
                'Guardar y Emitir'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
