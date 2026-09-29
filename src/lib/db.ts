import { Pool, type PoolClient } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __qaEvaluationPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __qaEvaluationSchema: Promise<void> | undefined;
}

export function getDb(): Pool {
  if (globalThis.__qaEvaluationPool) {
    return globalThis.__qaEvaluationPool;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL es obligatoria. Levanta el laboratorio con docker compose up --build.');
  }

  const pool = new Pool({ connectionString });
  globalThis.__qaEvaluationPool = pool;
  return pool;
}

export function ensureSchema(): Promise<void> {
  if (!globalThis.__qaEvaluationSchema) {
    const schema = (async () => {
      const db = getDb();
      await db.query(`
        CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY,
          run_id VARCHAR(80) NOT NULL,
          tipo_dte VARCHAR(16) NOT NULL,
          folio INTEGER NOT NULL,
          rut_receptor VARCHAR(20) NOT NULL,
          monto NUMERIC(14, 2) NOT NULL,
          fecha_emision DATE NOT NULL,
          estado VARCHAR(16) NOT NULL,
          contact_email TEXT,
          send_copy BOOLEAN NOT NULL DEFAULT FALSE,
          delivery_channel VARCHAR(16) NOT NULL DEFAULT 'PORTAL',
          observaciones TEXT,
          attachment_name TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT documents_run_folio_unique UNIQUE (run_id, folio)
        );
      `);
      // Migración para volúmenes creados con versiones anteriores del laboratorio.
      await db.query('ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();');
      await db.query('CREATE INDEX IF NOT EXISTS documents_run_rut_idx ON documents (run_id, rut_receptor);');
      // Una ejecución se siembra una sola vez: así un documento eliminado no reaparece.
      await db.query(`
        CREATE TABLE IF NOT EXISTS lab_runs (
          run_id VARCHAR(80) PRIMARY KEY,
          seeded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
    })();

    // Si falla (p. ej. la base aún no responde) no se cachea el error: el siguiente intento reintenta.
    schema.catch(() => {
      globalThis.__qaEvaluationSchema = undefined;
    });
    globalThis.__qaEvaluationSchema = schema;
  }

  return globalThis.__qaEvaluationSchema;
}

export async function withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getDb().connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
