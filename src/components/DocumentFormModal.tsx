'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, FilePlus, Loader2, Paperclip, Pencil, X } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { useDialogBehavior } from '@/components/useDialogBehavior';
import { ApiRequestError, apiFetch, errorMessage, isAbortError, isSessionError } from '@/lib/client';
import type { DocumentDTE } from '@/lib/types';
import {
  ATTACHMENT_FORMAT_MESSAGE,
  ATTACHMENT_SIZE_MESSAGE,
  LIMITS,
  hasAllowedAttachmentExtension,
  maxEmissionDate,
  validateDocumentInput,
  type DeliveryChannel,
  type DteType,
  type FieldError,
} from '@/lib/validation';

interface DocumentFormModalProps {
  /** Si se indica, el formulario edita ese documento; si no, emite uno nuevo. */
  documentId?: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}

interface FormState {
  tipoDte: DteType;
  folio: string;
  rutReceptor: string;
  monto: string;
  fechaEmision: string;
  deliveryChannel: DeliveryChannel;
  sendCopy: boolean;
  contactEmail: string;
  observaciones: string;
  attachmentName: string;
}

type FieldKey = keyof FormState;
type FieldErrors = Partial<Record<FieldKey, string>>;

const FIELD_IDS: Record<FieldKey, string> = {
  tipoDte: 'select-tipo-dte',
  fechaEmision: 'input-fecha-emision',
  folio: 'input-folio',
  rutReceptor: 'input-rut-receptor',
  monto: 'input-monto',
  attachmentName: 'input-adjunto',
  deliveryChannel: 'input-canal-portal',
  sendCopy: 'input-send-copy',
  contactEmail: 'input-contact-email',
  observaciones: 'input-observaciones',
};

const GENERIC_VALIDATION_MESSAGE = 'Corrige los campos indicados antes de continuar.';

const inputClass =
  'w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-60 disabled:cursor-not-allowed aria-[invalid=true]:border-red-500 aria-[invalid=true]:ring-red-200';
const labelClass = 'block text-sm font-semibold text-slate-700 mb-1';

function todayLocal(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function emptyForm(): FormState {
  return {
    tipoDte: 'DTE 34',
    folio: '',
    rutReceptor: '',
    monto: '',
    fechaEmision: todayLocal(),
    deliveryChannel: 'PORTAL',
    sendCopy: false,
    contactEmail: '',
    observaciones: '',
    attachmentName: '',
  };
}

function formFromDocument(doc: DocumentDTE): FormState {
  return {
    tipoDte: doc.tipoDte,
    folio: String(doc.folio),
    rutReceptor: doc.rutReceptor,
    monto: String(doc.monto),
    fechaEmision: doc.fechaEmision,
    deliveryChannel: doc.deliveryChannel,
    sendCopy: doc.sendCopy,
    contactEmail: doc.contactEmail ?? '',
    observaciones: doc.observaciones ?? '',
    attachmentName: doc.attachmentName ?? '',
  };
}

function parseNumber(raw: string): number | undefined {
  const text = raw.trim();
  return text === '' ? undefined : Number(text);
}

function toPayload(form: FormState) {
  return {
    tipoDte: form.tipoDte,
    folio: parseNumber(form.folio),
    rutReceptor: form.rutReceptor.trim(),
    monto: parseNumber(form.monto),
    fechaEmision: form.fechaEmision,
    deliveryChannel: form.deliveryChannel,
    sendCopy: form.sendCopy,
    contactEmail: form.contactEmail.trim() || null,
    observaciones: form.observaciones.trim() || null,
    attachmentName: form.attachmentName || null,
  };
}

function FieldErrorText({ field, message }: { field: FieldKey; message?: string }) {
  if (!message) return null;
  return (
    <p id={`error-${field}`} className="mt-1 text-xs text-red-600">
      {message}
    </p>
  );
}

export default function DocumentFormModal({ documentId, onClose, onSaved }: DocumentFormModalProps) {
  const isEdit = documentId !== undefined;
  const [form, setForm] = useState<FormState>(emptyForm);
  const [original, setOriginal] = useState<DocumentDTE | null>(null);
  const [isLoadingDocument, setIsLoadingDocument] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    if (!isSubmitting) onClose();
  };
  const containerRef = useDialogBehavior(handleClose);

  useEffect(() => {
    if (documentId === undefined) return;
    const controller = new AbortController();

    (async () => {
      try {
        const { data } = await apiFetch<DocumentDTE>(`/api/documents/${encodeURIComponent(documentId)}`, {
          signal: controller.signal,
        });
        setOriginal(data);
        setForm(formFromDocument(data));
        setIsLoadingDocument(false);
        requestAnimationFrame(() => document.getElementById(FIELD_IDS.rutReceptor)?.focus());
      } catch (caught) {
        if (isAbortError(caught) || isSessionError(caught)) return;
        setLoadError(errorMessage(caught, 'No fue posible cargar el documento.'));
        setIsLoadingDocument(false);
      }
    })();

    return () => controller.abort();
  }, [documentId]);

  const needsEmail = form.sendCopy || form.deliveryChannel === 'EMAIL';
  const isLocked = original?.estado === 'ACEPTADO';
  // El aviso genérico de validación se oculta cuando ya no quedan campos con error.
  const visibleFormError =
    formError !== null && (formError !== GENERIC_VALIDATION_MESSAGE || Object.keys(fieldErrors).length > 0)
      ? formError
      : null;

  const clearErrors = (...fields: FieldKey[]) => {
    setFieldErrors((previous) => {
      if (!fields.some((field) => field in previous)) return previous;
      const next = { ...previous };
      for (const field of fields) delete next[field];
      return next;
    });
  };

  const setField = <K extends FieldKey>(field: K, value: FormState[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    clearErrors(field);
  };

  const handleSendCopyChange = (checked: boolean) => {
    setForm((previous) => ({
      ...previous,
      sendCopy: checked,
      contactEmail: checked || previous.deliveryChannel === 'EMAIL' ? previous.contactEmail : '',
    }));
    clearErrors('sendCopy', 'contactEmail');
  };

  const handleChannelChange = (channel: DeliveryChannel) => {
    setForm((previous) => ({
      ...previous,
      deliveryChannel: channel,
      contactEmail: channel === 'EMAIL' || previous.sendCopy ? previous.contactEmail : '',
    }));
    clearErrors('deliveryChannel', 'contactEmail');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setField('attachmentName', '');
      return;
    }

    if (!hasAllowedAttachmentExtension(file.name) || file.size > LIMITS.attachmentMaxBytes) {
      const message = hasAllowedAttachmentExtension(file.name) ? ATTACHMENT_SIZE_MESSAGE : ATTACHMENT_FORMAT_MESSAGE;
      event.target.value = '';
      setForm((previous) => ({ ...previous, attachmentName: '' }));
      setFieldErrors((previous) => ({ ...previous, attachmentName: message }));
      return;
    }

    setField('attachmentName', file.name);
  };

  const showFieldErrors = (errors: FieldError[]) => {
    const next: FieldErrors = {};
    let firstField: FieldKey | null = null;
    let bodyMessage: string | null = null;

    for (const error of errors) {
      if (error.field in FIELD_IDS) {
        const field = error.field as FieldKey;
        if (!(field in next)) next[field] = error.message;
        firstField ??= field;
      } else {
        bodyMessage ??= error.message;
      }
    }

    setFieldErrors(next);
    setFormError(bodyMessage ?? GENERIC_VALIDATION_MESSAGE);
    if (firstField) document.getElementById(FIELD_IDS[firstField])?.focus();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting || isLocked) return;
    setFormError(null);

    const validation = validateDocumentInput(toPayload(form));
    if (!validation.ok) {
      showFieldErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});

    try {
      if (isEdit) {
        const { data } = await apiFetch<DocumentDTE>(`/api/documents/${encodeURIComponent(documentId)}`, {
          method: 'PUT',
          json: validation.value,
        });
        onSaved(`Documento folio ${data.folio} actualizado correctamente.`);
      } else {
        const { data } = await apiFetch<DocumentDTE>('/api/documents', { method: 'POST', json: validation.value });
        onSaved(`Documento folio ${data.folio} emitido correctamente.`);
      }
    } catch (caught) {
      if (isSessionError(caught)) return;
      setIsSubmitting(false);

      if (caught instanceof ApiRequestError) {
        if (caught.code === 'VALIDATION_ERROR' && caught.details.length > 0) {
          showFieldErrors(caught.details);
          return;
        }
        if (caught.code === 'DUPLICATE_FOLIO') setFieldErrors({ folio: '' });
      }

      setFormError(errorMessage(caught, 'Error al guardar el documento DTE.'));
    }
  };

  const a11y = (field: FieldKey) => {
    const message = fieldErrors[field];
    return {
      'aria-invalid': field in fieldErrors ? true : undefined,
      'aria-describedby': message ? `error-${field}` : undefined,
      'aria-errormessage': message ? `error-${field}` : undefined,
    } as const;
  };

  const title = !isEdit
    ? 'Emitir nuevo documento'
    : original
      ? `Editar documento - Folio #${original.folio}`
      : 'Editar documento';

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-600 p-2 rounded-lg">{isEdit ? <Pencil className="w-5 h-5" /> : <FilePlus className="w-5 h-5" />}</div>
            <div>
              <h2 id="modal-title" className="text-lg font-bold">{title}</h2>
              <p className="text-xs text-slate-300">Los campos con * son obligatorios.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Cerrar modal"
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoadingDocument && (
          <div role="status" aria-label="Cargando documento" className="flex items-center gap-3 p-8 text-sm text-slate-600">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" /> Cargando documento...
          </div>
        )}

        {loadError && (
          <div className="p-6 space-y-4">
            <div role="alert" className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{loadError}</span>
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={handleClose} className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                Cerrar
              </button>
            </div>
          </div>
        )}

        {!isLoadingDocument && !loadError && (
          <form onSubmit={handleSubmit} noValidate className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {visibleFormError && (
              <div role="alert" className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{visibleFormError}</span>
              </div>
            )}

            {original && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-600 space-y-1">
                <p className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">Estado actual:</span> <StatusBadge status={original.estado} />
                </p>
                {isLocked && <p>Este documento fue aceptado por el SII y no puede modificarse.</p>}
                {original.estado === 'RECHAZADO' && <p>Al guardar los cambios, el documento rechazado volverá a estado Pendiente.</p>}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor={FIELD_IDS.tipoDte} className={labelClass}>Tipo de documento tributario *</label>
                <select
                  id={FIELD_IDS.tipoDte}
                  data-autofocus={!isEdit ? true : undefined}
                  value={form.tipoDte}
                  disabled={isEdit}
                  onChange={(event) => setField('tipoDte', event.target.value as DteType)}
                  className={inputClass}
                  {...a11y('tipoDte')}
                >
                  <option value="DTE 33">DTE 33 - Factura Electrónica</option>
                  <option value="DTE 34">DTE 34 - Factura Non Afecta / Exenta</option>
                  <option value="DTE 39">DTE 39 - Boleta Electrónica</option>
                </select>
                <FieldErrorText field="tipoDte" message={fieldErrors.tipoDte} />
              </div>

              <div>
                <label htmlFor={FIELD_IDS.fechaEmision} className={labelClass}>Fecha de emisión *</label>
                <input
                  id={FIELD_IDS.fechaEmision}
                  type="date"
                  max={maxEmissionDate()}
                  value={form.fechaEmision}
                  onChange={(event) => setField('fechaEmision', event.target.value)}
                  className={inputClass}
                  {...a11y('fechaEmision')}
                />
                <FieldErrorText field="fechaEmision" message={fieldErrors.fechaEmision} />
              </div>

              <div>
                <label htmlFor={FIELD_IDS.folio} className={labelClass}>Número de folio *</label>
                <input
                  id={FIELD_IDS.folio}
                  type="number"
                  placeholder="Ej. 1004"
                  value={form.folio}
                  disabled={isEdit}
                  onChange={(event) => setField('folio', event.target.value)}
                  className={inputClass}
                  {...a11y('folio')}
                />
                <FieldErrorText field="folio" message={fieldErrors.folio} />
              </div>

              <div>
                <label htmlFor={FIELD_IDS.rutReceptor} className={labelClass}>RUT receptor *</label>
                <input
                  id={FIELD_IDS.rutReceptor}
                  type="text"
                  placeholder="Ej. 77.341.920-5"
                  value={form.rutReceptor}
                  onChange={(event) => setField('rutReceptor', event.target.value)}
                  className={inputClass}
                  {...a11y('rutReceptor')}
                />
                <FieldErrorText field="rutReceptor" message={fieldErrors.rutReceptor} />
              </div>

              <div>
                <label htmlFor={FIELD_IDS.monto} className={labelClass}>Monto total (CLP) *</label>
                <input
                  id={FIELD_IDS.monto}
                  type="number"
                  placeholder="Ej. 250000"
                  value={form.monto}
                  onChange={(event) => setField('monto', event.target.value)}
                  className={inputClass}
                  {...a11y('monto')}
                />
                <FieldErrorText field="monto" message={fieldErrors.monto} />
              </div>

              <div>
                <label htmlFor={FIELD_IDS.attachmentName} className={labelClass}>Documento de respaldo</label>
                <input
                  id={FIELD_IDS.attachmentName}
                  type="file"
                  accept=".pdf,.xml,.txt"
                  onChange={handleFileChange}
                  className="w-full text-sm text-slate-700 file:mr-3 file:border-0 file:rounded-lg file:bg-blue-50 file:px-3 file:py-2 file:text-blue-700"
                  {...a11y('attachmentName')}
                />
                {form.attachmentName && (
                  <p className="mt-1 text-xs text-slate-500 flex gap-1 items-center">
                    <Paperclip className="w-3 h-3" />
                    <span>{form.attachmentName}</span>
                    <button
                      type="button"
                      onClick={() => setField('attachmentName', '')}
                      aria-label="Quitar archivo adjunto"
                      className="ml-2 text-blue-700 underline hover:text-blue-900"
                    >
                      Quitar
                    </button>
                  </p>
                )}
                <FieldErrorText field="attachmentName" message={fieldErrors.attachmentName} />
              </div>
            </div>

            <fieldset className="border border-slate-200 rounded-xl p-4 space-y-3">
              <legend className="px-1 text-sm font-semibold text-slate-700">Canal de entrega</legend>
              <div className="flex flex-wrap gap-5">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    id={FIELD_IDS.deliveryChannel}
                    type="radio"
                    name="deliveryChannel"
                    value="PORTAL"
                    checked={form.deliveryChannel === 'PORTAL'}
                    onChange={() => handleChannelChange('PORTAL')}
                  />{' '}
                  Portal
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="deliveryChannel"
                    value="EMAIL"
                    checked={form.deliveryChannel === 'EMAIL'}
                    onChange={() => handleChannelChange('EMAIL')}
                  />{' '}
                  Correo electrónico
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  id={FIELD_IDS.sendCopy}
                  type="checkbox"
                  checked={form.sendCopy}
                  onChange={(event) => handleSendCopyChange(event.target.checked)}
                />{' '}
                Enviar copia al contacto
              </label>
              <div>
                <label htmlFor={FIELD_IDS.contactEmail} className={labelClass}>
                  Correo de contacto {needsEmail ? '*' : '(opcional)'}
                </label>
                <input
                  id={FIELD_IDS.contactEmail}
                  type="email"
                  placeholder="contacto@empresa.cl"
                  value={form.contactEmail}
                  disabled={!needsEmail}
                  onChange={(event) => setField('contactEmail', event.target.value)}
                  className={inputClass}
                  {...a11y('contactEmail')}
                />
                <FieldErrorText field="contactEmail" message={fieldErrors.contactEmail} />
              </div>
            </fieldset>

            <div>
              <label htmlFor={FIELD_IDS.observaciones} className={labelClass}>Observaciones</label>
              <textarea
                id={FIELD_IDS.observaciones}
                rows={3}
                maxLength={LIMITS.observacionesMax}
                placeholder="Información adicional para el receptor..."
                value={form.observaciones}
                onChange={(event) => setField('observaciones', event.target.value)}
                className={inputClass}
                {...a11y('observaciones')}
              />
              <div className="flex justify-between">
                <FieldErrorText field="observaciones" message={fieldErrors.observaciones} />
                <p id="observaciones-counter" className="mt-1 ml-auto text-xs text-slate-500">
                  {form.observaciones.length}/{LIMITS.observacionesMax}
                </p>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isLocked}
                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-md transition"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isEdit ? 'Guardando...' : 'Emitiendo...'}
                  </>
                ) : isEdit ? (
                  'Guardar cambios'
                ) : (
                  'Guardar y emitir'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
