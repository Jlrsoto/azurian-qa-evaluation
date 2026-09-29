import { Pool } from 'pg';

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
    globalThis.__qaEvaluationSchema = (async () => {
      await getDb().query(`
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
      await getDb().query(
        'CREATE INDEX IF NOT EXISTS documents_run_rut_idx ON documents (run_id, rut_receptor);'
      );
    })();
  }

  return globalThis.__qaEvaluationSchema;
}
