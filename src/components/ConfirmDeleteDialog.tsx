'use client';

import { useState } from 'react';
import { AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { useDialogBehavior } from '@/components/useDialogBehavior';
import { apiFetch, errorMessage, isSessionError } from '@/lib/client';
import type { DocumentDTE } from '@/lib/types';

interface ConfirmDeleteDialogProps {
  target: DocumentDTE;
  onClose: () => void;
  onDeleted: (message: string) => void;
}

export default function ConfirmDeleteDialog({ target, onClose, onDeleted }: ConfirmDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (!isDeleting) onClose();
  };
  const containerRef = useDialogBehavior(handleClose);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      await apiFetch<null>(`/api/documents/${encodeURIComponent(target.id)}`, { method: 'DELETE' });
      onDeleted(`Documento folio ${target.folio} eliminado correctamente.`);
    } catch (caught) {
      if (isSessionError(caught)) return;
      setError(errorMessage(caught, 'No fue posible eliminar el documento.'));
      setIsDeleting(false);
    }
  };

  return (
    <div
      ref={containerRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-description"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
        <div className="flex items-start gap-3">
          <div className="bg-red-100 text-red-600 p-2.5 rounded-xl shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h2 id="delete-dialog-title" className="text-lg font-bold text-slate-900">Eliminar documento</h2>
            <p id="delete-dialog-description" className="mt-1 text-sm text-slate-600">
              ¿Confirmas que deseas eliminar el documento {target.tipoDte} folio #{target.folio} del RUT{' '}
              {target.rutReceptor}? Esta acción no se puede deshacer.
            </p>
          </div>
        </div>

        {error && (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            data-autofocus
            onClick={handleClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 shadow-md transition"
          >
            {isDeleting ? <><Loader2 className="w-4 h-4 animate-spin" />Eliminando...</> : 'Eliminar documento'}
          </button>
        </div>
      </div>
    </div>
  );
}
