'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { useDialogBehavior } from '@/components/useDialogBehavior';
import { apiFetch, errorMessage, isAbortError, isSessionError } from '@/lib/client';
import type { DocumentDTE } from '@/lib/types';

interface DocumentDetailDialogProps {
  documentId: string;
  onClose: () => void;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-CL');
}

export default function DocumentDetailDialog({ documentId, onClose }: DocumentDetailDialogProps) {
  const [doc, setDoc] = useState<DocumentDTE | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useDialogBehavior(onClose);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const { data } = await apiFetch<DocumentDTE>(`/api/documents/${encodeURIComponent(documentId)}`, {
          signal: controller.signal,
        });
        setDoc(data);
        setIsLoading(false);
      } catch (caught) {
        if (isAbortError(caught) || isSessionError(caught)) return;
        setError(errorMessage(caught, 'No fue posible cargar el detalle del documento.'));
        setIsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [documentId]);

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
        <h2 id="detail-modal-title" className="text-lg font-bold text-slate-900">
          {doc ? `Detalle DTE - Folio #${doc.folio}` : 'Detalle del documento'}
        </h2>

        {isLoading && (
          <div role="status" aria-label="Cargando detalle del documento" className="flex items-center gap-3 py-6 text-sm text-slate-600">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" /> Cargando detalle del documento...
          </div>
        )}

        {error && (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {doc && (
          <div className="space-y-2 text-sm text-slate-600 bg-slate-50 p-4 rounded-xl">
            <p><span className="font-semibold text-slate-800">Tipo:</span> {doc.tipoDte}</p>
            <p><span className="font-semibold text-slate-800">RUT Receptor:</span> {doc.rutReceptor}</p>
            <p><span className="font-semibold text-slate-800">Monto:</span> $ {doc.monto.toLocaleString('es-CL')} CLP</p>
            <p><span className="font-semibold text-slate-800">Fecha Emisión:</span> {doc.fechaEmision}</p>
            <p className="flex items-center gap-2"><span className="font-semibold text-slate-800">Estado:</span> <StatusBadge status={doc.estado} /></p>
            <p><span className="font-semibold text-slate-800">Canal:</span> {doc.deliveryChannel}</p>
            <p><span className="font-semibold text-slate-800">Copia al contacto:</span> {doc.sendCopy ? 'Sí' : 'No'}</p>
            {doc.contactEmail && <p><span className="font-semibold text-slate-800">Correo de contacto:</span> {doc.contactEmail}</p>}
            {doc.attachmentName && <p><span className="font-semibold text-slate-800">Adjunto:</span> {doc.attachmentName}</p>}
            {doc.observaciones && <p><span className="font-semibold text-slate-800">Observaciones:</span> {doc.observaciones}</p>}
            <p><span className="font-semibold text-slate-800">Creado:</span> {formatDateTime(doc.createdAt)}</p>
            <p><span className="font-semibold text-slate-800">Última modificación:</span> {formatDateTime(doc.updatedAt)}</p>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            data-autofocus
            onClick={onClose}
            className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-800 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
