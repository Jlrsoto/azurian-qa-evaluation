import { createHmac, timingSafeEqual } from 'crypto';
import { unauthorized } from '@/lib/errors';
import type { AuthUserDTO } from '@/lib/types';

const DEFAULT_TTL_SECONDS = 3600;
const DEFAULT_SECRET = 'azurian-qa-lab-secret';

export interface TokenClaims {
  sub: string;
  email: string;
  name: string;
  role: string;
  iat: number;
  exp: number;
}

export function getTokenTtlSeconds(): number {
  const value = Number(process.env.LAB_TOKEN_TTL_SECONDS);
  return Number.isInteger(value) && value >= 1 && value <= 86_400 ? value : DEFAULT_TTL_SECONDS;
}

function sign(data: string): string {
  return createHmac('sha256', process.env.LAB_TOKEN_SECRET || DEFAULT_SECRET).update(data).digest('base64url');
}

function encode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

/** Emite un JWT HS256 firmado. `expiresIn` es la vigencia en segundos (por defecto 3600). */
export function issueToken(user: AuthUserDTO, nowMs: number = Date.now()): { token: string; expiresIn: number } {
  const expiresIn = getTokenTtlSeconds();
  const issuedAt = Math.floor(nowMs / 1000);
  const header = encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = encode(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      iat: issuedAt,
      exp: issuedAt + expiresIn,
    } satisfies TokenClaims)
  );
  return { token: `${header}.${payload}.${sign(`${header}.${payload}`)}`, expiresIn };
}

export function verifyToken(token: string, nowMs: number = Date.now()): TokenClaims {
  const parts = token.split('.');
  if (parts.length !== 3) throw unauthorized('Token inválido.');

  const [header, payload, signature] = parts;
  const expected = Buffer.from(sign(`${header}.${payload}`));
  const received = Buffer.from(signature);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    throw unauthorized('Token inválido.');
  }

  let claims: TokenClaims;
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as TokenClaims;
  } catch {
    throw unauthorized('Token inválido.');
  }

  if (typeof claims.exp !== 'number' || typeof claims.sub !== 'string') throw unauthorized('Token inválido.');
  if (claims.exp <= Math.floor(nowMs / 1000)) {
    throw unauthorized('El token expiró. Inicia sesión nuevamente.', 'TOKEN_EXPIRED');
  }

  return claims;
}

/** Lee `Authorization: Bearer <token>` y devuelve las claims, o lanza 401. */
export function authenticate(request: Request): TokenClaims {
  const header = request.headers.get('authorization');
  if (!header) throw unauthorized('Falta el encabezado Authorization: Bearer <token>.');

  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  if (!match) throw unauthorized('El encabezado Authorization debe usar el esquema Bearer.');

  return verifyToken(match[1]);
}
