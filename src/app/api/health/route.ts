import { NextResponse } from 'next/server';
import { ensureSchema } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await ensureSchema();
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('Healthcheck falló:', error);
    return NextResponse.json({ status: 'unavailable' }, { status: 503 });
  }
}
