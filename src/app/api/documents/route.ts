import { authenticate } from '@/lib/auth';
import { validationError } from '@/lib/errors';
import { handle, readJsonObject, respond } from '@/lib/http';
import { requireRunId } from '@/lib/lab';
import { documentsStore } from '@/lib/store';
import { parseListQuery, validateDocumentInput } from '@/lib/validation';

export const runtime = 'nodejs';

export const GET = handle(async (request) => {
  authenticate(request);
  const runId = requireRunId(request);

  const query = parseListQuery(new URL(request.url).searchParams);
  if (!query.ok) throw validationError(query.errors);

  const { items, total } = await documentsStore.list(runId, query.value);

  const headers: Record<string, string> = { 'x-total-count': String(total) };
  if (query.value.paginated) {
    headers['x-page'] = String(query.value.page);
    headers['x-page-size'] = String(query.value.pageSize);
    headers['x-total-pages'] = String(Math.max(1, Math.ceil(total / query.value.pageSize)));
  }

  return respond(200, items, headers);
});

export const POST = handle(async (request) => {
  authenticate(request);
  const runId = requireRunId(request);

  const validation = validateDocumentInput(await readJsonObject(request));
  if (!validation.ok) throw validationError(validation.errors);

  const created = await documentsStore.add(runId, validation.value);
  return respond(201, created, { Location: `/api/documents/${created.id}` });
});
