import { issueToken } from '@/lib/auth';
import { invalidCredentials, validationError } from '@/lib/errors';
import { handle, readJsonObject, respond } from '@/lib/http';
import type { AuthUserDTO } from '@/lib/types';
import type { FieldError } from '@/lib/validation';

export const runtime = 'nodejs';

export const POST = handle(async (request) => {
  const body = await readJsonObject(request);

  // `username` se mantiene como alias de `email` por compatibilidad.
  const rawEmail = body.email ?? body.username;
  const email = typeof rawEmail === 'string' ? rawEmail.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  const errors: FieldError[] = [];
  if (!email) errors.push({ field: 'email', message: 'El correo es obligatorio.' });
  if (!password) errors.push({ field: 'password', message: 'La contraseña es obligatoria.' });
  if (errors.length > 0) throw validationError(errors);

  const expectedUser = process.env.LAB_USERNAME || 'admin@azurian.com';
  const expectedPassword = process.env.LAB_PASSWORD || 'Azurian2026!';

  if (email.toLowerCase() !== expectedUser.toLowerCase() || password !== expectedPassword) {
    throw invalidCredentials();
  }

  const user: AuthUserDTO = {
    id: 'user-azurian-01',
    email: expectedUser,
    name: 'Administrador Azurian',
    role: 'QA Lab Participant',
  };
  const { token, expiresIn } = issueToken(user);

  return respond(200, { token, expiresIn, user });
});
