import type { ApiErrorBody, AuthUserDTO } from '@/lib/types';
import type { FieldError } from '@/lib/validation';

// Utilidades del navegador: sesión (localStorage), identificador de ejecución y cliente HTTP del portal.

const TOKEN_KEY = 'azurian_token';
const USER_KEY = 'azurian_user';
const RUN_ID_KEY = 'azurian_lab_run_id';

export function getLabRunId(): string {
  const saved = localStorage.getItem(RUN_ID_KEY);
  if (saved) return saved;

  const runId = `ui-${crypto.randomUUID()}`;
  localStorage.setItem(RUN_ID_KEY, runId);
  return runId;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUserDTO | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUserDTO;
  } catch {
    return null;
  }
}

export function saveSession(token: string, user: AuthUserDTO): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: FieldError[];
  readonly sessionExpired: boolean;

  constructor(status: number, code: string, message: string, details: FieldError[] = [], sessionExpired = false) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.sessionExpired = sessionExpired;
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/** La sesión se invalidó (401): el cliente ya limpió el token y está redirigiendo al login. */
export function isSessionError(error: unknown): boolean {
  return error instanceof ApiRequestError && error.sessionExpired;
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

interface ApiFetchInit {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  json?: unknown;
  signal?: AbortSignal;
}

/**
 * Llama al API del laboratorio con `Authorization: Bearer` y `x-lab-run-id`.
 * Ante un 401 limpia la sesión y redirige a /login?expired=1.
 */
export async function apiFetch<T>(
  path: string,
  { method = 'GET', json, signal }: ApiFetchInit = {}
): Promise<{ data: T; headers: Headers }> {
  const headers = new Headers({ 'x-lab-run-id': getLabRunId() });
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (json !== undefined) headers.set('Content-Type', 'application/json');

  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers,
      body: json !== undefined ? JSON.stringify(json) : undefined,
      signal,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ApiRequestError(0, 'NETWORK_ERROR', 'Error de red al intentar comunicarse con el API.');
  }

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (response.status === 401) {
    clearSession();
    window.location.assign('/login?expired=1');
    throw new ApiRequestError(401, 'UNAUTHORIZED', 'Tu sesión expiró. Inicia sesión nuevamente.', [], true);
  }

  if (!response.ok) {
    const apiError = (body ?? {}) as Partial<ApiErrorBody>;
    throw new ApiRequestError(
      response.status,
      apiError.code ?? 'UNKNOWN_ERROR',
      apiError.error ?? 'Ocurrió un error inesperado.',
      apiError.details ?? []
    );
  }

  return { data: body as T, headers: response.headers };
}
