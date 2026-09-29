import { authenticate } from '@/lib/auth';
import { handle, respond } from '@/lib/http';

export const runtime = 'nodejs';

export const GET = handle(async (request) => {
  const claims = authenticate(request);

  return respond(200, {
    user: { id: claims.sub, email: claims.email, name: claims.name, role: claims.role },
    issuedAt: new Date(claims.iat * 1000).toISOString(),
    expiresAt: new Date(claims.exp * 1000).toISOString(),
  });
});
