import { randomUUID } from 'crypto';
import { ensureSchema, getDb } from '@/lib/db';

export interface DocumentDTE {
  id: string;
  tipoDte: string;
  folio: number;
  rutReceptor: string;
  monto: number;
  fechaEmision: string;
  estado: 'ACEPTADO' | 'PENDIENTE' | 'RECHAZADO';
  contactEmail?: string | null;
  sendCopy: boolean;
  deliveryChannel: 'PORTAL' | 'EMAIL';
  observaciones?: string | null;
  attachmentName?: string | null;
}

export class DuplicateDocumentError extends Error {
  constructor() {
    super('Ya existe un documento con ese folio para esta ejecución.');
  }
}

interface DocumentRow {
  id: string;
  tipo_dte: string;
  folio: number;
  rut_receptor: string;
  monto: string | number;
  fecha_emision: string;
  estado: DocumentDTE['estado'];
  contact_email: string | null;
  send_copy: boolean;
  delivery_channel: DocumentDTE['deliveryChannel'];
  observaciones: string | null;
  attachment_name: string | null;
}

type SeedDocument = readonly [
  id: string,
  tipoDte: string,
  folio: number,
  rutReceptor: string,
  monto: number,
  fechaEmision: string,
  estado: DocumentDTE['estado'],
];

const baseDocuments: SeedDocument[] = [
  ['seed-1001', 'DTE 33', 1001, '76.192.584-9', 150000, '2026-09-15', 'ACEPTADO'],
  ['seed-1002', 'DTE 34', 2045, '96.885.120-K', 3400000, '2026-09-18', 'ACEPTADO'],
  ['seed-1003', 'DTE 39', 8812, '15.421.990-4', 45900, '2026-09-20', 'PENDIENTE'],
];

const seedReceivers = [
  { rut: '76.192.584-9', folioBase: 1030, montoBase: 210000 },
  { rut: '96.885.120-K', folioBase: 2050, montoBase: 780000 },
  { rut: '15.421.990-4', folioBase: 8830, montoBase: 98000 },
  { rut: '77.341.920-5', folioBase: 3100, montoBase: 1250000 },
  { rut: '78.456.321-6', folioBase: 4200, montoBase: 345000 },
  { rut: '76.555.444-3', folioBase: 5300, montoBase: 670000 },
  { rut: '99.888.777-2', folioBase: 6400, montoBase: 1840000 },
  { rut: '12.345.678-5', folioBase: 7500, montoBase: 97000 },
  { rut: '76.123.456-0', folioBase: 8600, montoBase: 420000 },
  { rut: '77.777.777-7', folioBase: 9700, montoBase: 2230000 },
  { rut: '61.234.567-8', folioBase: 10800, montoBase: 156000 },
  { rut: '88.765.432-1', folioBase: 11900, montoBase: 890000 },
  { rut: '76.998.112-3', folioBase: 12000, montoBase: 315000 },
  { rut: '75.432.109-6', folioBase: 13100, montoBase: 540000 },
  { rut: '79.321.654-2', folioBase: 14200, montoBase: 730000 },
];

const documentTypes = ['DTE 33', 'DTE 34', 'DTE 39'] as const;

const generatedDocuments: SeedDocument[] = seedReceivers.flatMap((receiver, receiverIndex) =>
  documentTypes.map((tipoDte, typeIndex): SeedDocument => [
    `seed-${receiverIndex + 1}-${typeIndex + 1}`,
    tipoDte,
    receiver.folioBase + typeIndex,
    receiver.rut,
    receiver.montoBase + typeIndex * 27500,
    `2026-09-${String(((receiverIndex * 3 + typeIndex) % 28) + 1).padStart(2, '0')}`,
    typeIndex === 0 ? 'PENDIENTE' : typeIndex === 1 ? 'ACEPTADO' : 'RECHAZADO',
  ])
);

const initialDocuments: SeedDocument[] = [...baseDocuments, ...generatedDocuments];

function toDocument(row: DocumentRow): DocumentDTE {
  return {
    id: row.id,
    tipoDte: row.tipo_dte,
    folio: Number(row.folio),
    rutReceptor: row.rut_receptor,
    monto: Number(row.monto),
    fechaEmision: String(row.fecha_emision).slice(0, 10),
    estado: row.estado,
    contactEmail: row.contact_email,
    sendCopy: row.send_copy,
    deliveryChannel: row.delivery_channel,
    observaciones: row.observaciones,
    attachmentName: row.attachment_name,
  };
}

async function seedRun(runId: string): Promise<void> {
  await ensureSchema();
  for (const [id, tipoDte, folio, rutReceptor, monto, fechaEmision, estado] of initialDocuments) {
    await getDb().query(
      `INSERT INTO documents
        (id, run_id, tipo_dte, folio, rut_receptor, monto, fecha_emision, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (run_id, folio) DO NOTHING`,
      [`${runId}-${id}`, runId, tipoDte, folio, rutReceptor, monto, fechaEmision, estado]
    );
  }
}

export const documentsStore = {
  async list(runId: string, rut?: string, tipoDte?: string): Promise<DocumentDTE[]> {
    await seedRun(runId);

    const values: string[] = [runId];
    const filters = ['run_id = $1'];

    if (rut?.trim()) {
      values.push(rut.replace(/[.\-]/g, '').toLowerCase());
      filters.push(`LOWER(REPLACE(REPLACE(rut_receptor, '.', ''), '-', '')) LIKE '%' || $${values.length} || '%'`);
    }

    if (tipoDte && tipoDte !== 'TODOS') {
      values.push(tipoDte);
      filters.push(`tipo_dte = $${values.length}`);
    }

    const result = await getDb().query<DocumentRow>(
      `SELECT id, tipo_dte, folio, rut_receptor, monto, TO_CHAR(fecha_emision, 'YYYY-MM-DD') AS fecha_emision, estado,
              contact_email, send_copy, delivery_channel, observaciones, attachment_name
       FROM documents
       WHERE ${filters.join(' AND ')}
       ORDER BY created_at DESC, folio ASC`,
      values
    );

    return result.rows.map(toDocument);
  },

  async add(
    runId: string,
    doc: Omit<DocumentDTE, 'id' | 'estado'> & { estado?: DocumentDTE['estado'] }
  ): Promise<DocumentDTE> {
    await seedRun(runId);
    const id = randomUUID();

    try {
      const result = await getDb().query<DocumentRow>(
        `INSERT INTO documents
          (id, run_id, tipo_dte, folio, rut_receptor, monto, fecha_emision, estado,
           contact_email, send_copy, delivery_channel, observaciones, attachment_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id, tipo_dte, folio, rut_receptor, monto, TO_CHAR(fecha_emision, 'YYYY-MM-DD') AS fecha_emision, estado,
                   contact_email, send_copy, delivery_channel, observaciones, attachment_name`,
        [
          id,
          runId,
          doc.tipoDte,
          doc.folio,
          doc.rutReceptor,
          doc.monto,
          doc.fechaEmision,
          doc.estado || 'ACEPTADO',
          doc.contactEmail || null,
          doc.sendCopy,
          doc.deliveryChannel,
          doc.observaciones || null,
          doc.attachmentName || null,
        ]
      );
      return toDocument(result.rows[0]);
    } catch (error: unknown) {
      if (typeof error === 'object' && error && 'code' in error && error.code === '23505') {
        throw new DuplicateDocumentError();
      }
      throw error;
    }
  },

  async reset(runId: string): Promise<void> {
    await ensureSchema();
    await getDb().query('DELETE FROM documents WHERE run_id = $1', [runId]);
    await seedRun(runId);
  },
};
