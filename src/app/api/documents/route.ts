import { NextResponse } from 'next/server';
import { documentsStore } from '@/lib/store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rutParam = searchParams.get('rut') || undefined;

  const docs = documentsStore.filterByRut(rutParam);
  return NextResponse.json(docs, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tipoDte, folio, rutReceptor, monto } = body;

    // Validación de campos obligatorios
    if (!tipoDte || folio === undefined || folio === null || !rutReceptor || monto === undefined || monto === null) {
      return NextResponse.json(
        {
          error: 'Campos requeridos faltantes.',
          details: 'Debes proporcionar tipoDte, folio, rutReceptor y monto.',
        },
        { status: 400 }
      );
    }

    if (isNaN(Number(folio)) || Number(folio) <= 0) {
      return NextResponse.json(
        { error: 'El folio debe ser un número entero positivo.' },
        { status: 400 }
      );
    }

    if (isNaN(Number(monto)) || Number(monto) < 0) {
      return NextResponse.json(
        { error: 'El monto debe ser un valor numérico válido.' },
        { status: 400 }
      );
    }

    const createdDocument = documentsStore.add({
      tipoDte: String(tipoDte),
      folio: Number(folio),
      rutReceptor: String(rutReceptor).trim(),
      monto: Number(monto),
    });

    return NextResponse.json(createdDocument, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Solicitud JSON inválida.' },
      { status: 400 }
    );
  }
}
