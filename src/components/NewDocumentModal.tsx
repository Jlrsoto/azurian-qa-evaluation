'use client';

import { useState } from 'react';
import { AlertCircle, FilePlus, Loader2, Paperclip, X } from 'lucide-react';

interface NewDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentCreated: () => void;
}

function getLabRunId(): string {
  const savedRunId = localStorage.getItem('azurian_lab_run_id');
  if (savedRunId) return savedRunId;

  const runId = `ui-${crypto.randomUUID()}`;
  localStorage.setItem('azurian_lab_run_id', runId);
  return runId;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NewDocumentModal({ isOpen, onClose, onDocumentCreated }: NewDocumentModalProps) {
  const [tipoDte, setTipoDte] = useState('DTE 34');
  const [folio, setFolio] = useState('');
  const [rutReceptor, setRutReceptor] = useState('');
  const [monto, setMonto] = useState('');
  const [fechaEmision, setFechaEmision] = useState(today);
  const [sendCopy, setSendCopy] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [deliveryChannel, setDeliveryChannel] = useState<'PORTAL' | 'EMAIL'>('PORTAL');
  const [observaciones, setObservaciones] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const clearForm = () => {
    setFolio('');
    setRutReceptor('');
    setMonto('');
    setFechaEmision(today());
    setSendCopy(false);
    setContactEmail('');
    setDeliveryChannel('PORTAL');
    setObservaciones('');
    setAttachmentName('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg(null);

    if (!folio || !rutReceptor || !monto || !fechaEmision) {
      setErrorMsg('Completa los campos obligatorios antes de emitir.');
      return;
    }

    if (sendCopy && !contactEmail) {
      setErrorMsg('Indica un correo para enviar la copia del documento.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-lab-run-id': getLabRunId(),
        },
        body: JSON.stringify({
          tipoDte,
          folio: Number(folio),
          rutReceptor,
          monto: Number(monto),
          fechaEmision,
          sendCopy,
          contactEmail,
          deliveryChannel,
          observaciones,
          attachmentName,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setErrorMsg(data.error || 'Error al emitir el documento DTE.');
        return;
      }

      clearForm();
      onClose();
      onDocumentCreated();
    } catch {
      setErrorMsg('Error de red al intentar comunicarse con el API.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="modal-title" className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden transform transition-all">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-600 p-2 rounded-lg"><FilePlus className="w-5 h-5" /></div>
            <div>
              <h2 id="modal-title" className="text-lg font-bold">Emitir nuevo documento</h2>
              <p className="text-xs text-slate-300">Los campos con * son obligatorios.</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar modal" className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div role="alert" className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" /><span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="select-tipo-dte" className="block text-sm font-semibold text-slate-700 mb-1">Tipo de documento tributario *</label>
              <select id="select-tipo-dte" value={tipoDte} onChange={(event) => setTipoDte(event.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600">
                <option value="DTE 33">DTE 33 - Factura Electrónica</option>
                <option value="DTE 34">DTE 34 - Factura Non Afecta / Exenta</option>
                <option value="DTE 39">DTE 39 - Boleta Electrónica</option>
              </select>
            </div>
            <div>
              <label htmlFor="input-fecha-emision" className="block text-sm font-semibold text-slate-700 mb-1">Fecha de emisión *</label>
              <input id="input-fecha-emision" type="date" value={fechaEmision} onChange={(event) => setFechaEmision(event.target.value)} required className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
            <div>
              <label htmlFor="input-folio" className="block text-sm font-semibold text-slate-700 mb-1">Número de folio *</label>
              <input id="input-folio" type="number" min="1" placeholder="Ej. 1004" value={folio} onChange={(event) => setFolio(event.target.value)} required className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
            <div>
              <label htmlFor="input-rut-receptor" className="block text-sm font-semibold text-slate-700 mb-1">RUT receptor *</label>
              <input id="input-rut-receptor" type="text" placeholder="Ej. 77.341.920-5" value={rutReceptor} onChange={(event) => setRutReceptor(event.target.value)} required className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
            <div>
              <label htmlFor="input-monto" className="block text-sm font-semibold text-slate-700 mb-1">Monto total (CLP) *</label>
              <input id="input-monto" type="number" min="0" placeholder="Ej. 250000" value={monto} onChange={(event) => setMonto(event.target.value)} required className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
            <div>
              <label htmlFor="input-adjunto" className="block text-sm font-semibold text-slate-700 mb-1">Documento de respaldo</label>
              <input id="input-adjunto" type="file" accept=".pdf,.xml,.txt" onChange={(event) => setAttachmentName(event.target.files?.[0]?.name || '')} className="w-full text-sm text-slate-700 file:mr-3 file:border-0 file:rounded-lg file:bg-blue-50 file:px-3 file:py-2 file:text-blue-700" />
              {attachmentName && <p className="mt-1 text-xs text-slate-500 flex gap-1 items-center"><Paperclip className="w-3 h-3" />{attachmentName}</p>}
            </div>
          </div>

          <fieldset className="border border-slate-200 rounded-xl p-4 space-y-3">
            <legend className="px-1 text-sm font-semibold text-slate-700">Canal de entrega</legend>
            <div className="flex flex-wrap gap-5">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="radio" name="deliveryChannel" value="PORTAL" checked={deliveryChannel === 'PORTAL'} onChange={() => setDeliveryChannel('PORTAL')} /> Portal
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="radio" name="deliveryChannel" value="EMAIL" checked={deliveryChannel === 'EMAIL'} onChange={() => setDeliveryChannel('EMAIL')} /> Correo electrónico
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={sendCopy} onChange={(event) => setSendCopy(event.target.checked)} /> Enviar copia al contacto
            </label>
            <div>
              <label htmlFor="input-contact-email" className="block text-sm font-semibold text-slate-700 mb-1">Correo de contacto {sendCopy ? '*' : '(opcional)'}</label>
              <input id="input-contact-email" type="email" placeholder="contacto@empresa.cl" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} required={sendCopy} disabled={!sendCopy} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
          </fieldset>

          <div>
            <label htmlFor="input-observaciones" className="block text-sm font-semibold text-slate-700 mb-1">Observaciones</label>
            <textarea id="input-observaciones" rows={3} maxLength={300} placeholder="Información adicional para el receptor..." value={observaciones} onChange={(event) => setObservaciones(event.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600" />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-50">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-md transition">
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Emitiendo...</> : 'Guardar y emitir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
