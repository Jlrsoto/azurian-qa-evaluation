import { NextResponse } from 'next/server';
import { getRunId } from '@/lib/lab';
import { documentsStore } from '@/lib/store';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const runId = getRunId(request);
  const resetKey = request.headers.get('x-lab-reset-key');

  if (!runId) {
    return NextResponse.json({ error: 'x-lab-run-id inválido.' }, { status: 400 });
  }

  if (!process.env.LAB_RESET_KEY || resetKey !== process.env.LAB_RESET_KEY) {
    return NextResponse.json({ error: 'No autorizado para reiniciar esta ejecución.' }, { status: 403 });
  }

  await documentsStore.reset(runId);
  return NextResponse.json({ status: 'reset', runId }, { status: 200 });
}
