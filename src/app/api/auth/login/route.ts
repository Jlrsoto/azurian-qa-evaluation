import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Acepta tanto "username" como "email" en el payload por flexibilidad
    const userEmail = username || body.email;

    if (userEmail === 'admin@azurian.com' && password === 'Azurian2026!') {
      return NextResponse.json(
        {
          token: 'jwt-token-azurian-xyz-2026-qa-lead',
          expiresIn: 3600,
          user: {
            id: 'user-azurian-01',
            email: 'admin@azurian.com',
            name: 'Administrador Azurian',
            role: 'QA Lead Evaluator',
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        error: 'Credenciales inválidas. Por favor verifique su usuario y contraseña.',
      },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Formato de solicitud inválido.' },
      { status: 400 }
    );
  }
}
