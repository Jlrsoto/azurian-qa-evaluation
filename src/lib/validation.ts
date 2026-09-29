// Reglas de negocio y validación compartidas entre el API (servidor) y la UI (navegador).
// Debe permanecer puro: sin imports de Node.js ni de Next.js, porque también se empaqueta para el cliente.

export const DTE_TYPES = ['DTE 33', 'DTE 34', 'DTE 39'] as const;
export const DOCUMENT_STATUSES = ['ACEPTADO', 'PENDIENTE', 'RECHAZADO'] as const;
export const DELIVERY_CHANNELS = ['PORTAL', 'EMAIL'] as const;

export type DteType = (typeof DTE_TYPES)[number];
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];
export type DeliveryChannel = (typeof DELIVERY_CHANNELS)[number];

export const LIMITS = {
  folioMin: 1,
  folioMax: 9_999_999,
  montoMin: 1,
  montoMax: 999_999_999,
  observacionesMax: 300,
  emailMax: 120,
  attachmentNameMax: 120,
  attachmentExtensions: ['.pdf', '.xml', '.txt'],
  attachmentMaxBytes: 2 * 1024 * 1024,
  fechaMin: '2000-01-01',
} as const;

/** El SII simulado rechaza los documentos cuyo monto supera este valor. */
export const SII_MAX_MONTO = 10_000_000;

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

export interface FieldError {
  field: string;
  message: string;
}

export interface DocumentFields {
  tipoDte: DteType;
  folio: number;
  rutReceptor: string;
  monto: number;
  fechaEmision: string;
  deliveryChannel: DeliveryChannel;
  sendCopy: boolean;
  contactEmail: string | null;
  observaciones: string | null;
  attachmentName: string | null;
}

export type ValidationResult =
  | { ok: true; value: DocumentFields }
  | { ok: false; errors: FieldError[] };

export const DOCUMENT_FIELD_KEYS = [
  'tipoDte',
  'folio',
  'rutReceptor',
  'monto',
  'fechaEmision',
  'deliveryChannel',
  'sendCopy',
  'contactEmail',
  'observaciones',
  'attachmentName',
] as const satisfies readonly (keyof DocumentFields)[];

const IMMUTABLE_MESSAGES = {
  tipoDte: 'El tipo de DTE no puede modificarse una vez emitido el documento.',
  folio: 'El folio no puede modificarse una vez emitido el documento.',
} as const;

const RUT_FORMAT = /^\d{1,2}\.\d{3}\.\d{3}-[\dKk]$/;
const RUT_FILTER_FORMAT = /^[0-9.\-kK]{1,12}$/;
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

function isOneOf<T extends string>(options: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (options as readonly string[]).includes(value);
}

function formatThousands(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function computeRutCheckDigit(body: string): string {
  let sum = 0;
  let factor = 2;
  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const remainder = 11 - (sum % 11);
  if (remainder === 11) return '0';
  if (remainder === 10) return 'K';
  return String(remainder);
}

/** Valida formato `12.345.678-9` y dígito verificador (módulo 11). */
export function isValidRut(rut: string): boolean {
  const value = rut.trim();
  if (!RUT_FORMAT.test(value)) return false;
  const [body, checkDigit] = value.replace(/\./g, '').split('-');
  return computeRutCheckDigit(body) === checkDigit.toUpperCase();
}

export function normalizeRut(rut: string): string {
  return rut.trim().toUpperCase();
}

export function isValidCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Fecha máxima aceptada: hoy (UTC) + 1 día, para tolerar diferencias de zona horaria. */
export function maxEmissionDate(now: Date = new Date()): string {
  const limit = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return limit.toISOString().slice(0, 10);
}

export function hasAllowedAttachmentExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return LIMITS.attachmentExtensions.some((extension) => lower.endsWith(extension));
}

export const ATTACHMENT_FORMAT_MESSAGE = 'El documento de respaldo debe ser un archivo .pdf, .xml o .txt.';
export const ATTACHMENT_SIZE_MESSAGE = 'El documento de respaldo no puede superar los 2 MB.';

// ---------------------------------------------------------------------------
// Validación de un documento completo (crear / reemplazar)
// ---------------------------------------------------------------------------

type Check<T> = { value: T } | { error: string };

function unwrap<T>(errors: FieldError[], field: string, check: Check<T>): T | undefined {
  if ('error' in check) {
    errors.push({ field, message: check.error });
    return undefined;
  }
  return check.value;
}

function checkTipoDte(value: unknown): Check<DteType> {
  if (isBlank(value)) return { error: 'El tipo de DTE es obligatorio.' };
  if (!isOneOf(DTE_TYPES, value)) return { error: 'Tipo de DTE no soportado. Usa DTE 33, DTE 34 o DTE 39.' };
  return { value };
}

function checkFolio(value: unknown): Check<number> {
  if (isBlank(value)) return { error: 'El folio es obligatorio.' };
  if (!isInteger(value)) return { error: 'El folio debe ser un número entero.' };
  if (value < LIMITS.folioMin || value > LIMITS.folioMax) {
    return { error: `El folio debe estar entre ${formatThousands(LIMITS.folioMin)} y ${formatThousands(LIMITS.folioMax)}.` };
  }
  return { value };
}

function checkRut(value: unknown): Check<string> {
  if (isBlank(value)) return { error: 'El RUT del receptor es obligatorio.' };
  if (typeof value !== 'string' || !RUT_FORMAT.test(value.trim())) {
    return { error: 'El RUT debe tener formato 12.345.678-9.' };
  }
  if (!isValidRut(value)) return { error: 'El dígito verificador del RUT no es válido.' };
  return { value: normalizeRut(value) };
}

function checkMonto(value: unknown): Check<number> {
  if (isBlank(value)) return { error: 'El monto es obligatorio.' };
  if (!isInteger(value)) return { error: 'El monto debe ser un número entero en CLP.' };
  if (value < LIMITS.montoMin || value > LIMITS.montoMax) {
    return { error: `El monto debe estar entre ${formatThousands(LIMITS.montoMin)} y ${formatThousands(LIMITS.montoMax)}.` };
  }
  return { value };
}

function checkFecha(value: unknown, now: Date): Check<string> {
  if (isBlank(value)) return { error: 'La fecha de emisión es obligatoria.' };
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { error: 'La fecha de emisión debe tener formato YYYY-MM-DD.' };
  }
  if (!isValidCalendarDate(value)) return { error: 'La fecha de emisión no es una fecha válida.' };
  if (value < LIMITS.fechaMin) return { error: 'La fecha de emisión no puede ser anterior al 2000-01-01.' };
  if (value > maxEmissionDate(now)) return { error: 'La fecha de emisión no puede ser futura.' };
  return { value };
}

function checkChannel(value: unknown): Check<DeliveryChannel> {
  const channel = value ?? 'PORTAL';
  if (!isOneOf(DELIVERY_CHANNELS, channel)) return { error: 'Canal de entrega no soportado. Usa PORTAL o EMAIL.' };
  return { value: channel };
}

function checkSendCopy(value: unknown): Check<boolean> {
  const sendCopy = value ?? false;
  if (typeof sendCopy !== 'boolean') return { error: 'sendCopy debe ser verdadero o falso.' };
  return { value: sendCopy };
}

function checkEmail(value: unknown, required: boolean): Check<string | null> {
  if (value !== undefined && value !== null && typeof value !== 'string') {
    return { error: 'El correo de contacto debe ser texto.' };
  }
  const email = typeof value === 'string' ? value.trim() : '';
  if (email === '') {
    return required
      ? { error: 'El correo de contacto es obligatorio cuando se entrega por correo o se envía copia.' }
      : { value: null };
  }
  if (email.length > LIMITS.emailMax) {
    return { error: `El correo de contacto no puede superar ${LIMITS.emailMax} caracteres.` };
  }
  if (!EMAIL_FORMAT.test(email)) return { error: 'El correo de contacto no tiene un formato válido.' };
  return { value: email };
}

function checkObservaciones(value: unknown): Check<string | null> {
  if (value === undefined || value === null) return { value: null };
  if (typeof value !== 'string') return { error: 'Las observaciones deben ser texto.' };
  const text = value.trim();
  if (text.length > LIMITS.observacionesMax) {
    return { error: `Las observaciones no pueden superar ${LIMITS.observacionesMax} caracteres.` };
  }
  return { value: text || null };
}

function checkAttachmentName(value: unknown): Check<string | null> {
  if (value === undefined || value === null) return { value: null };
  if (typeof value !== 'string') return { error: 'El nombre del adjunto debe ser texto.' };
  const name = value.trim();
  if (name === '') return { value: null };
  if (/[\\/]/.test(name) || name.length > LIMITS.attachmentNameMax) {
    return { error: 'El nombre del adjunto no es válido.' };
  }
  if (!hasAllowedAttachmentExtension(name)) return { error: ATTACHMENT_FORMAT_MESSAGE };
  return { value: name };
}

/**
 * Valida un documento completo. Devuelve TODOS los errores encontrados (no sólo el primero)
 * y los valores ya normalizados (RUT en mayúsculas, textos recortados, opcionales en null).
 */
export function validateDocumentInput(input: unknown, now: Date = new Date()): ValidationResult {
  if (!isRecord(input)) {
    return { ok: false, errors: [{ field: 'body', message: 'El cuerpo de la solicitud debe ser un objeto JSON.' }] };
  }

  const errors: FieldError[] = [];
  const tipoDte = unwrap(errors, 'tipoDte', checkTipoDte(input.tipoDte));
  const folio = unwrap(errors, 'folio', checkFolio(input.folio));
  const rutReceptor = unwrap(errors, 'rutReceptor', checkRut(input.rutReceptor));
  const monto = unwrap(errors, 'monto', checkMonto(input.monto));
  const fechaEmision = unwrap(errors, 'fechaEmision', checkFecha(input.fechaEmision, now));
  const deliveryChannel = unwrap(errors, 'deliveryChannel', checkChannel(input.deliveryChannel));
  const sendCopy = unwrap(errors, 'sendCopy', checkSendCopy(input.sendCopy));
  const contactEmail = unwrap(
    errors,
    'contactEmail',
    checkEmail(input.contactEmail, sendCopy === true || deliveryChannel === 'EMAIL')
  );
  const observaciones = unwrap(errors, 'observaciones', checkObservaciones(input.observaciones));
  const attachmentName = unwrap(errors, 'attachmentName', checkAttachmentName(input.attachmentName));

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      tipoDte,
      folio,
      rutReceptor,
      monto,
      fechaEmision,
      deliveryChannel,
      sendCopy,
      contactEmail,
      observaciones,
      attachmentName,
    } as DocumentFields,
  };
}

/**
 * Valida una actualización sobre un documento existente.
 * - `replace` (PUT): el cuerpo es la representación completa; los campos omitidos vuelven a su valor por defecto.
 * - `patch` (PATCH): sólo se validan los campos enviados, combinados con el estado actual.
 * `tipoDte` y `folio` son inmutables: si se envían, deben coincidir con los actuales.
 */
export function validateDocumentUpdate(
  input: Record<string, unknown>,
  current: DocumentFields,
  mode: 'replace' | 'patch',
  now: Date = new Date()
): ValidationResult {
  const immutableErrors: FieldError[] = [];
  for (const field of ['tipoDte', 'folio'] as const) {
    if (field in input && input[field] !== current[field]) {
      immutableErrors.push({ field, message: IMMUTABLE_MESSAGES[field] });
    }
  }

  let candidate: Record<string, unknown> = input;
  if (mode === 'patch') {
    candidate = { ...current };
    for (const key of DOCUMENT_FIELD_KEYS) {
      if (key in input) candidate[key] = input[key];
    }
  }

  const result = validateDocumentInput(candidate, now);
  const alreadyReported = new Set(immutableErrors.map((error) => error.field));
  const otherErrors = result.ok ? [] : result.errors.filter((error) => !alreadyReported.has(error.field));
  const errors = [...immutableErrors, ...otherErrors];

  if (errors.length > 0) return { ok: false, errors };
  return result;
}

export function hasPatchableFields(input: Record<string, unknown>): boolean {
  return DOCUMENT_FIELD_KEYS.some((key) => key in input);
}

// ---------------------------------------------------------------------------
// Validación de filtros del listado
// ---------------------------------------------------------------------------

export interface ListQuery {
  rut?: string;
  tipoDte?: DteType;
  estado?: DocumentStatus;
  paginated: boolean;
  page: number;
  pageSize: number;
}

export type ListQueryResult = { ok: true; value: ListQuery } | { ok: false; errors: FieldError[] };

function parsePositiveInt(raw: string | null, min: number, max: number): number | null | undefined {
  if (raw === null || raw === '') return undefined;
  if (!/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return value >= min && value <= max ? value : null;
}

export function parseListQuery(params: URLSearchParams): ListQueryResult {
  const errors: FieldError[] = [];
  const value: ListQuery = { paginated: false, page: 1, pageSize: DEFAULT_PAGE_SIZE };

  const rut = params.get('rut')?.trim();
  if (rut) {
    if (RUT_FILTER_FORMAT.test(rut)) value.rut = rut;
    else errors.push({ field: 'rut', message: 'El filtro rut solo admite dígitos, puntos, guion y K (máximo 12 caracteres).' });
  }

  const tipoDte = params.get('tipoDte')?.trim();
  if (tipoDte && tipoDte !== 'TODOS') {
    if (isOneOf(DTE_TYPES, tipoDte)) value.tipoDte = tipoDte;
    else errors.push({ field: 'tipoDte', message: 'tipoDte no soportado. Usa DTE 33, DTE 34, DTE 39 o TODOS.' });
  }

  const estado = params.get('estado')?.trim();
  if (estado && estado !== 'TODOS') {
    if (isOneOf(DOCUMENT_STATUSES, estado)) value.estado = estado;
    else errors.push({ field: 'estado', message: 'estado no soportado. Usa ACEPTADO, PENDIENTE, RECHAZADO o TODOS.' });
  }

  const page = parsePositiveInt(params.get('page'), 1, Number.MAX_SAFE_INTEGER);
  if (page === null) errors.push({ field: 'page', message: 'page debe ser un entero mayor o igual a 1.' });

  const pageSize = parsePositiveInt(params.get('pageSize'), 1, MAX_PAGE_SIZE);
  if (pageSize === null) errors.push({ field: 'pageSize', message: `pageSize debe ser un entero entre 1 y ${MAX_PAGE_SIZE}.` });

  if (errors.length > 0) return { ok: false, errors };

  if (page !== undefined || pageSize !== undefined) {
    value.paginated = true;
    value.page = page ?? 1;
    value.pageSize = pageSize ?? DEFAULT_PAGE_SIZE;
  }

  return { ok: true, value };
}
