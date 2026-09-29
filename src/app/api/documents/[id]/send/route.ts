import { authenticate } from '@/lib/auth';
import { handle, respond } from '@/lib/http';
import { requireRunId } from '@/lib/lab';
import { documentsStore } from '@/lib/store';

export const runtime = 'nodejs';

interface Params {
  id: string;
}

/** Envío al SII simulado: PENDIENTE → ACEPTADO (monto ≤ 10.000.000) o RECHAZADO (monto mayor). */
export const POST = handle<Params>(async (request, { id }) => {
  authenticate(request);
  const runId = requireRunId(request);

  return respond(200, await documentsStore.send(runId, id));
});
