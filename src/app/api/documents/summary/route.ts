import { authenticate } from '@/lib/auth';
import { handle, respond } from '@/lib/http';
import { requireRunId } from '@/lib/lab';
import { documentsStore } from '@/lib/store';

export const runtime = 'nodejs';

export const GET = handle(async (request) => {
  authenticate(request);
  const runId = requireRunId(request);

  return respond(200, await documentsStore.summary(runId));
});
