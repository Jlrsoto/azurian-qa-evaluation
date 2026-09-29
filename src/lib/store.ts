import { randomUUID } from 'crypto';
import type { PoolClient } from 'pg';
import { ensureSchema, getDb, withTransaction } from '@/lib/db';
import { documentLocked, duplicateFolio, invalidState, notFound } from '@/lib/errors';
import type { DocumentDTE, DocumentSummary } from '@/lib/types';
import {
  SII_MAX_MONTO,
  type DocumentFields,
  type DocumentStatus,
  type ListQuery,
} from '@/lib/validation';

interface DocumentRow {
  id: string;
  tipo_dte: DocumentDTE['tipoDte'];
  folio: number;
  rut_receptor: string;
  monto: string | number;
  fecha_emision: string;
  estado: DocumentStatus;
  contact_email: string | null;
  send_copy: boolean;
  delivery_channel: DocumentDTE['deliveryChannel'];
  observaciones: string | null;
  attachment_name: string | null;
  created_at: Date;
  updated_at: Date;
}

const COLUMNS = `id, tipo_dte, folio, rut_receptor, monto, TO_CHAR(fecha_emision, 'YYYY-MM-DD') AS fecha_emision,
  estado, contact_email, send_copy, delivery_channel, observaciones, attachment_name, created_at, updated_at`;

type SeedDocument = readonly [
  id: string,
  tipoDte: string,
  folio: number,
  rutReceptor: string,
  monto: number,
  fechaEmision: string,
  estado: DocumentStatus,
];

// Todos los RUT del seed tienen dígito verificador válido (módulo 11).
const baseDocuments: SeedDocument[] = [
  ['seed-1001', 'DTE 33', 1001, '76.192.584-9', 150000, '2026-09-15', 'ACEPTADO'],
  ['seed-1002', 'DTE 34', 2045, '96.885.125-K', 3400000, '2026-09-18', 'ACEPTADO'],
  ['seed-1003', 'DTE 39', 8812, '15.421.990-0', 45900, '2026-09-20', 'PENDIENTE'],
];

const seedReceivers = [
  { rut: '76.192.584-9', folioBase: 1030, montoBase: 210000 },
  { rut: '96.885.125-K', folioBase: 2050, montoBase: 780000 },
  { rut: '15.421.990-0', folioBase: 8830, montoBase: 98000 },
  { rut: '77.341.920-5', folioBase: 3100, montoBase: 1250000 },
  { rut: '78.456.321-9', folioBase: 4200, montoBase: 345000 },
  { rut: '76.555.444-6', folioBase: 5300, montoBase: 670000 },
  { rut: '99.888.777-1', folioBase: 6400, montoBase: 1840000 },
  { rut: '12.345.678-5', folioBase: 7500, montoBase: 97000 },
  { rut: '76.123.456-0', folioBase: 8600, montoBase: 420000 },
  { rut: '77.777.777-7', folioBase: 9700, montoBase: 2230000 },
  { rut: '61.234.567-8', folioBase: 10800, montoBase: 156000 },
  { rut: '88.765.432-8', folioBase: 11900, montoBase: 890000 },
  { rut: '76.998.112-8', folioBase: 12000, montoBase: 315000 },
  { rut: '75.432.109-1', folioBase: 13100, montoBase: 540000 },
  { rut: '79.321.654-8', folioBase: 14200, montoBase: 730000 },
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

export const SEED_DOCUMENTS: readonly SeedDocument[] = [...baseDocuments, ...generatedDocuments];

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
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

async function insertSeeds(client: PoolClient, runId: string): Promise<void> {
  await client.query(
    `INSERT INTO documents (id, run_id, tipo_dte, folio, rut_receptor, monto, fecha_emision, estado)
     SELECT seed.id, $1::varchar, seed.tipo_dte, seed.folio, seed.rut_receptor, seed.monto, seed.fecha_emision::date, seed.estado
     FROM UNNEST($2::text[], $3::text[], $4::int[], $5::text[], $6::numeric[], $7::text[], $8::text[])
          AS seed(id, tipo_dte, folio, rut_receptor, monto, fecha_emision, estado)
     ON CONFLICT (run_id, folio) DO NOTHING`,
    [
      runId,
      SEED_DOCUMENTS.map(([id]) => `${runId}-${id}`),
      SEED_DOCUMENTS.map(([, tipoDte]) => tipoDte),
      SEED_DOCUMENTS.map(([, , folio]) => folio),
      SEED_DOCUMENTS.map(([, , , rutReceptor]) => rutReceptor),
      SEED_DOCUMENTS.map(([, , , , monto]) => monto),
      SEED_DOCUMENTS.map(([, , , , , fechaEmision]) => fechaEmision),
      SEED_DOCUMENTS.map(([, , , , , , estado]) => estado),
    ]
  );
}

/** Siembra la ejecución la primera vez que se usa. Después nunca vuelve a insertar semillas. */
async function ensureRunSeeded(runId: string): Promise<void> {
  await ensureSchema();

  const known = await getDb().query('SELECT 1 FROM lab_runs WHERE run_id = $1', [runId]);
  if (known.rowCount) return;

  await withTransaction(async (client) => {
    const inserted = await client.query(
      'INSERT INTO lab_runs (run_id) VALUES ($1) ON CONFLICT (run_id) DO NOTHING RETURNING run_id',
      [runId]
    );
    if (inserted.rowCount) await insertSeeds(client, runId);
  });
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}

/** Distingue "no existe" de "existe pero el estado no permite la operación". */
async function findState(runId: string, id: string): Promise<DocumentStatus | null> {
  const result = await getDb().query<{ estado: DocumentStatus }>(
    'SELECT estado FROM documents WHERE id = $1 AND run_id = $2',
    [id, runId]
  );
  return result.rows[0]?.estado ?? null;
}

export const documentsStore = {
  async list(runId: string, query: ListQuery): Promise<{ items: DocumentDTE[]; total: number }> {
    await ensureRunSeeded(runId);

    const values: unknown[] = [runId];
    const filters = ['run_id = $1'];

    if (query.rut) {
      values.push(query.rut.replace(/[.\-]/g, '').toLowerCase());
      filters.push(`STRPOS(LOWER(REPLACE(REPLACE(rut_receptor, '.', ''), '-', '')), $${values.length}) > 0`);
    }

    if (query.tipoDte) {
      values.push(query.tipoDte);
      filters.push(`tipo_dte = $${values.length}`);
    }

    if (query.estado) {
      values.push(query.estado);
      filters.push(`estado = $${values.length}`);
    }

    const where = filters.join(' AND ');
    let listSql = `SELECT ${COLUMNS} FROM documents WHERE ${where} ORDER BY fecha_emision DESC, folio DESC`;
    const listValues = [...values];

    if (query.paginated) {
      listValues.push(query.pageSize, (query.page - 1) * query.pageSize);
      listSql += ` LIMIT $${listValues.length - 1} OFFSET $${listValues.length}`;
    }

    const [count, rows] = await Promise.all([
      getDb().query<{ total: string }>(`SELECT COUNT(*) AS total FROM documents WHERE ${where}`, values),
      getDb().query<DocumentRow>(listSql, listValues),
    ]);

    return { items: rows.rows.map(toDocument), total: Number(count.rows[0].total) };
  },

  async get(runId: string, id: string): Promise<DocumentDTE | null> {
    await ensureRunSeeded(runId);
    const result = await getDb().query<DocumentRow>(
      `SELECT ${COLUMNS} FROM documents WHERE id = $1 AND run_id = $2`,
      [id, runId]
    );
    return result.rows[0] ? toDocument(result.rows[0]) : null;
  },

  /** Los documentos nuevos nacen PENDIENTE: el estado lo controla el servidor, no el cliente. */
  async add(runId: string, doc: DocumentFields): Promise<DocumentDTE> {
    await ensureRunSeeded(runId);

    try {
      const result = await getDb().query<DocumentRow>(
        `INSERT INTO documents
          (id, run_id, tipo_dte, folio, rut_receptor, monto, fecha_emision, estado,
           contact_email, send_copy, delivery_channel, observaciones, attachment_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDIENTE', $8, $9, $10, $11, $12)
         RETURNING ${COLUMNS}`,
        [
          randomUUID(),
          runId,
          doc.tipoDte,
          doc.folio,
          doc.rutReceptor,
          doc.monto,
          doc.fechaEmision,
          doc.contactEmail,
          doc.sendCopy,
          doc.deliveryChannel,
          doc.observaciones,
          doc.attachmentName,
        ]
      );
      return toDocument(result.rows[0]);
    } catch (error: unknown) {
      if (isUniqueViolation(error)) throw duplicateFolio();
      throw error;
    }
  },

  /**
   * Actualiza los campos editables. `tipoDte` y `folio` no se tocan.
   * Un documento ACEPTADO está bloqueado; uno RECHAZADO vuelve a PENDIENTE al corregirse.
   */
  async update(runId: string, id: string, doc: DocumentFields): Promise<DocumentDTE> {
    const result = await getDb().query<DocumentRow>(
      `UPDATE documents
          SET rut_receptor = $3, monto = $4, fecha_emision = $5, contact_email = $6, send_copy = $7,
              delivery_channel = $8, observaciones = $9, attachment_name = $10,
              estado = CASE WHEN estado = 'RECHAZADO' THEN 'PENDIENTE' ELSE estado END,
              updated_at = NOW()
        WHERE id = $1 AND run_id = $2 AND estado <> 'ACEPTADO'
        RETURNING ${COLUMNS}`,
      [
        id,
        runId,
        doc.rutReceptor,
        doc.monto,
        doc.fechaEmision,
        doc.contactEmail,
        doc.sendCopy,
        doc.deliveryChannel,
        doc.observaciones,
        doc.attachmentName,
      ]
    );

    if (result.rows[0]) return toDocument(result.rows[0]);
    throw (await findState(runId, id)) ? documentLocked() : notFound();
  },

  async remove(runId: string, id: string): Promise<void> {
    const result = await getDb().query(
      `DELETE FROM documents WHERE id = $1 AND run_id = $2 AND estado <> 'ACEPTADO'`,
      [id, runId]
    );

    if (result.rowCount) return;
    throw (await findState(runId, id)) ? documentLocked() : notFound();
  },

  /** Envío al SII simulado: sólo PENDIENTE. Acepta hasta SII_MAX_MONTO; sobre ese monto rechaza. */
  async send(runId: string, id: string): Promise<DocumentDTE> {
    await ensureRunSeeded(runId);

    const result = await getDb().query<DocumentRow>(
      `UPDATE documents
          SET estado = CASE WHEN monto > $3 THEN 'RECHAZADO' ELSE 'ACEPTADO' END, updated_at = NOW()
        WHERE id = $1 AND run_id = $2 AND estado = 'PENDIENTE'
        RETURNING ${COLUMNS}`,
      [id, runId, SII_MAX_MONTO]
    );

    if (result.rows[0]) return toDocument(result.rows[0]);

    const estado = await findState(runId, id);
    if (!estado) throw notFound();
    throw invalidState(estado);
  },

  async summary(runId: string): Promise<DocumentSummary> {
    await ensureRunSeeded(runId);

    const result = await getDb().query<{ estado: DocumentStatus; cantidad: string; monto: string }>(
      `SELECT estado, COUNT(*) AS cantidad, COALESCE(SUM(monto), 0) AS monto
         FROM documents WHERE run_id = $1 GROUP BY estado`,
      [runId]
    );

    const summary: DocumentSummary = {
      total: 0,
      montoTotal: 0,
      porEstado: { ACEPTADO: 0, PENDIENTE: 0, RECHAZADO: 0 },
    };

    for (const row of result.rows) {
      summary.porEstado[row.estado] = Number(row.cantidad);
      summary.total += Number(row.cantidad);
      summary.montoTotal += Number(row.monto);
    }

    return summary;
  },

  /** Reinicio administrativo: borra la ejecución y la vuelve a sembrar. */
  async reset(runId: string): Promise<void> {
    await ensureSchema();

    await withTransaction(async (client) => {
      await client.query('DELETE FROM documents WHERE run_id = $1', [runId]);
      await client.query('INSERT INTO lab_runs (run_id) VALUES ($1) ON CONFLICT (run_id) DO NOTHING', [runId]);
      await insertSeeds(client, runId);
    });
  },
};
