import type { DocumentStatus, FieldError } from '@/lib/validation';

/** Error de dominio con el contrato de respuesta del laboratorio: { error, code, details? }. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: FieldError[];
  readonly headers?: Record<string, string>;

  constructor(status: number, code: string, message: string, details?: FieldError[], headers?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.headers = headers;
  }
}

export const validationError = (details: FieldError[]) =>
  new ApiError(400, 'VALIDATION_ERROR', 'Datos de entrada inválidos. Revisa los campos indicados.', details);

export const invalidJson = (message = 'Solicitud JSON inválida.') => new ApiError(400, 'INVALID_JSON', message);

export const invalidRunId = () =>
  new ApiError(
    400,
    'INVALID_RUN_ID',
    'x-lab-run-id inválido. Usa entre 3 y 80 caracteres alfanuméricos, guiones o guiones bajos.'
  );

export const unauthorized = (message: string, code: 'UNAUTHORIZED' | 'TOKEN_EXPIRED' = 'UNAUTHORIZED') =>
  new ApiError(401, code, message, undefined, { 'WWW-Authenticate': 'Bearer' });

export const invalidCredentials = () =>
  new ApiError(401, 'INVALID_CREDENTIALS', 'Credenciales inválidas. Por favor verifique su usuario y contraseña.');

export const forbidden = (message: string) => new ApiError(403, 'FORBIDDEN', message);

export const notFound = () => new ApiError(404, 'NOT_FOUND', 'El documento no existe en esta ejecución.');

export const duplicateFolio = () =>
  new ApiError(409, 'DUPLICATE_FOLIO', 'Ya existe un documento con ese folio para esta ejecución.');

export const documentLocked = () =>
  new ApiError(409, 'DOCUMENT_LOCKED', 'Un documento aceptado no puede modificarse ni eliminarse.');

export const invalidState = (estado: DocumentStatus) =>
  new ApiError(
    409,
    'INVALID_STATE',
    `Solo un documento PENDIENTE puede enviarse al SII (estado actual: ${estado}).`
  );
