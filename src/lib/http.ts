import { NextResponse } from 'next/server';
import { ApiError, invalidJson } from '@/lib/errors';
import { applyLabHeaders, getRequestId, waitForLabDelay } from '@/lib/lab';
import type { ApiErrorBody } from '@/lib/types';

export interface HandlerResult {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

export function respond(status: number, body?: unknown, headers?: Record<string, string>): HandlerResult {
  return { status, body, headers };
}

type Handler<P> = (request: Request, params: P) => Promise<HandlerResult>;

interface HandleOptions {
  /** Aplica la latencia aleatoria del laboratorio (por defecto sí). */
  delay?: boolean;
}

function toResponse(result: HandlerResult, delay: number, requestId: string): Response {
  const response =
    result.body === undefined || result.status === 204
      ? new NextResponse(null, { status: result.status })
      : NextResponse.json(result.body, { status: result.status });

  for (const [name, value] of Object.entries(result.headers ?? {})) {
    response.headers.set(name, value);
  }

  return applyLabHeaders(response, delay, requestId);
}

/**
 * Envuelve un handler de ruta: aplica la latencia del laboratorio, agrega x-request-id / x-lab-delay-ms
 * y traduce los errores de dominio (ApiError) al contrato { error, code, details? }.
 */
export function handle<P = unknown>(handler: Handler<P>, options: HandleOptions = {}) {
  return async (request: Request, context?: { params: Promise<P> }): Promise<Response> => {
    const delay = options.delay === false ? 0 : await waitForLabDelay();
    const requestId = getRequestId();

    try {
      const params = context ? await context.params : ({} as P);
      return toResponse(await handler(request, params), delay, requestId);
    } catch (error) {
      if (error instanceof ApiError) {
        const body: ApiErrorBody = { error: error.message, code: error.code };
        if (error.details) body.details = error.details;
        return toResponse({ status: error.status, body, headers: error.headers }, delay, requestId);
      }

      console.error('Error no controlado en el laboratorio:', error);
      const body: ApiErrorBody = { error: 'Error interno del laboratorio.', code: 'INTERNAL_ERROR' };
      return toResponse({ status: 500, body }, delay, requestId);
    }
  };
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw invalidJson();
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw invalidJson('El cuerpo de la solicitud debe ser un objeto JSON.');
  }

  return body as Record<string, unknown>;
}
