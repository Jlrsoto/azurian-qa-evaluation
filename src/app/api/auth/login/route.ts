import { NextResponse } from 'next/server';
import { applyLabHeaders, getRequestId, waitForLabDelay } from '@/lib/lab';

export const runtime = 'nodejs';

function respond(body: unknown, status: number, delay: number, requestId: string) {
  return applyLabHeaders(NextResponse.json(body, { status }), delay, requestId);
}

export async function POST(request: Request) {
  const delay = await waitForLabDelay();
  const requestId = getRequestId();

  try {
    const body = await request.json();
    const userEmail = body.username || body.email;
    const expectedUser = process.env.LAB_USERNAME || 'admin@azurian.com';
    const expectedPassword = process.env.LAB_PASSWORD || 'Azurian2026!';

    if (userEmail === expectedUser && body.password === expectedPassword) {
      return respond(
        {
          token: 'qa-lab-token-portal-documentos',
          expiresIn: 3600,
          user: {
            id: 'user-azurian-01',
            email: expectedUser,
            name: 'Administrador Azurian',
            role: 'QA Lab Participant',
          },
        },
        200,
        delay,
        requestId
      );
    }

    return respond(
      { error: 'Credenciales inválidas. Por favor verifique su usuario y contraseña.' },
      401,
      delay,
      requestId
    );
  } catch (error) {
    return respond({ error: 'Formato de solicitud inválido.' }, 400, delay, requestId);
  }
}
