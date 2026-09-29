import { authenticate } from '@/lib/auth';
import { documentLocked, notFound, validationError } from '@/lib/errors';
import { handle, readJsonObject, respond } from '@/lib/http';
import { requireRunId } from '@/lib/lab';
import { documentsStore } from '@/lib/store';
import { hasPatchableFields, validateDocumentUpdate } from '@/lib/validation';

export const runtime = 'nodejs';

interface Params {
  id: string;
}

// Orden de precedencia de errores: 401 → 400 (x-lab-run-id) → 404 → 400 (cuerpo) → 409 (estado).

export const GET = handle<Params>(async (request, { id }) => {
  authenticate(request);
  const runId = requireRunId(request);

  const document = await documentsStore.get(runId, id);
  if (!document) throw notFound();

  return respond(200, document);
});

async function update(request: Request, id: string, mode: 'replace' | 'patch') {
  authenticate(request);
  const runId = requireRunId(request);

  const current = await documentsStore.get(runId, id);
  if (!current) throw notFound();

  const body = await readJsonObject(request);
  if (mode === 'patch' && !hasPatchableFields(body)) {
    throw validationError([{ field: 'body', message: 'Indica al menos un campo editable para actualizar.' }]);
  }

  const validation = validateDocumentUpdate(body, current, mode);
  if (!validation.ok) throw validationError(validation.errors);

  if (current.estado === 'ACEPTADO') throw documentLocked();

  return respond(200, await documentsStore.update(runId, id, validation.value));
}

export const PUT = handle<Params>((request, { id }) => update(request, id, 'replace'));

export const PATCH = handle<Params>((request, { id }) => update(request, id, 'patch'));

export const DELETE = handle<Params>(async (request, { id }) => {
  authenticate(request);
  const runId = requireRunId(request);

  await documentsStore.remove(runId, id);
  return respond(204);
});
