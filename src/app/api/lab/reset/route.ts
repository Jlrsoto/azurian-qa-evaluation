import { forbidden } from '@/lib/errors';
import { handle, respond } from '@/lib/http';
import { requireRunId } from '@/lib/lab';
import { documentsStore } from '@/lib/store';

export const runtime = 'nodejs';

// Endpoint administrativo del facilitador: no aplica la latencia simulada.
export const POST = handle(
  async (request) => {
    const runId = requireRunId(request);
    const resetKey = request.headers.get('x-lab-reset-key');

    if (!process.env.LAB_RESET_KEY || resetKey !== process.env.LAB_RESET_KEY) {
      throw forbidden('No autorizado para reiniciar esta ejecución.');
    }

    await documentsStore.reset(runId);
    return respond(200, { status: 'reset', runId });
  },
  { delay: false }
);
