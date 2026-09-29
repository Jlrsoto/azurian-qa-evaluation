import { NextResponse } from 'next/server';
import { DuplicateDocumentError, documentsStore } from '@/lib/store';
import { applyLabHeaders, getRequestId, getRunId, waitForLabDelay } from '@/lib/lab';

export const runtime = 'nodejs';

const VALID_DTE_TYPES = ['DTE 33', 'DTE 34', 'DTE 39'];
const VALID_DELIVERY_CHANNELS = ['PORTAL', 'EMAIL'];
const RUT_PATTERN = /^\d{1,3}(?:\.\d{3}){2}-[\dKk]$/;

function respond(body: unknown, status: number, delay: number, requestId: string) {
  return applyLabHeaders(NextResponse.json(body, { status }), delay, requestId);
}

function invalidRunResponse() {
  return NextResponse.json(
    { error: 'x-lab-run-id inválido. Usa entre 3 y 80 caracteres alfanuméricos, guiones o guiones bajos.' },
    { status: 400 }
  );
}

export async function GET(request: Request) {
  const runId = getRunId(request);
  if (!runId) return invalidRunResponse();

  const delay = await waitForLabDelay();
  const requestId = getRequestId();
  const { searchParams } = new URL(request.url);
  const rut = searchParams.get('rut') || undefined;
  const tipoDte = searchParams.get('tipoDte') || undefined;

  if (tipoDte && tipoDte !== 'TODOS' && !VALID_DTE_TYPES.includes(tipoDte)) {
    return respond({ error: 'tipoDte no soportado.' }, 400, delay, requestId);
  }

  try {
    const docs = await documentsStore.list(runId, rut, tipoDte);
    return respond(docs, 200, delay, requestId);
  } catch (error) {
    console.error('No fue posible listar documentos:', error);
    return respond({ error: 'No fue posible consultar los documentos.' }, 500, delay, requestId);
  }
}

export async function POST(request: Request) {
  const runId = getRunId(request);
  if (!runId) return invalidRunResponse();

  const delay = await waitForLabDelay();
  const requestId = getRequestId();

  try {
    const body = await request.json();
    const {
      tipoDte,
      folio,
      rutReceptor,
      monto,
      fechaEmision,
      contactEmail,
      sendCopy = false,
      deliveryChannel = 'PORTAL',
      observaciones = '',
      attachmentName = '',
    } = body;

    if (!tipoDte || folio === undefined || !rutReceptor || monto === undefined || !fechaEmision) {
      return respond(
        { error: 'Campos requeridos faltantes.', details: 'tipoDte, folio, rutReceptor, monto y fechaEmision son obligatorios.' },
        400,
        delay,
        requestId
      );
    }

    if (!VALID_DTE_TYPES.includes(String(tipoDte))) {
      return respond({ error: 'Tipo de DTE no soportado.' }, 400, delay, requestId);
    }

    if (!Number.isInteger(Number(folio)) || Number(folio) <= 0) {
      return respond({ error: 'El folio debe ser un número entero positivo.' }, 400, delay, requestId);
    }

    if (!RUT_PATTERN.test(String(rutReceptor).trim())) {
      return respond({ error: 'El RUT debe tener formato 12.345.678-9.' }, 400, delay, requestId);
    }

    if (!Number.isFinite(Number(monto)) || Number(monto) < 0) {
      return respond({ error: 'El monto debe ser un valor numérico válido.' }, 400, delay, requestId);
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fechaEmision))) {
      return respond({ error: 'La fecha de emisión debe tener formato YYYY-MM-DD.' }, 400, delay, requestId);
    }

    if (!VALID_DELIVERY_CHANNELS.includes(String(deliveryChannel))) {
      return respond({ error: 'Canal de entrega no soportado.' }, 400, delay, requestId);
    }

    if (sendCopy && !/^\S+@\S+\.\S+$/.test(String(contactEmail || ''))) {
      return respond({ error: 'Debes indicar un correo válido al enviar copia por correo.' }, 400, delay, requestId);
    }

    const createdDocument = await documentsStore.add(runId, {
      tipoDte: String(tipoDte),
      folio: Number(folio),
      rutReceptor: String(rutReceptor).trim(),
      monto: Number(monto),
      fechaEmision: String(fechaEmision),
      contactEmail: contactEmail ? String(contactEmail).trim() : null,
      sendCopy: Boolean(sendCopy),
      deliveryChannel: String(deliveryChannel) as 'PORTAL' | 'EMAIL',
      observaciones: String(observaciones).trim() || null,
      attachmentName: String(attachmentName).trim() || null,
    });

    return respond(createdDocument, 201, delay, requestId);
  } catch (error) {
    if (error instanceof DuplicateDocumentError) {
      return respond({ error: error.message }, 409, delay, requestId);
    }

    if (error instanceof SyntaxError) {
      return respond({ error: 'Solicitud JSON inválida.' }, 400, delay, requestId);
    }

    console.error('No fue posible crear documento:', error);
    return respond({ error: 'No fue posible emitir el documento.' }, 500, delay, requestId);
  }
}
