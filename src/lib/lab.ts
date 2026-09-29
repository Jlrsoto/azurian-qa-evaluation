import { randomUUID } from 'crypto';

const DEFAULT_MIN_DELAY = 300;
const DEFAULT_MAX_DELAY = 3200;
const RUN_ID_PATTERN = /^[A-Za-z0-9_-]{3,80}$/;

function readDelay(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 && value <= 10_000 ? value : fallback;
}

export async function waitForLabDelay(): Promise<number> {
  const min = readDelay('LAB_DELAY_MIN_MS', DEFAULT_MIN_DELAY);
  const max = Math.max(min, readDelay('LAB_DELAY_MAX_MS', DEFAULT_MAX_DELAY));
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise((resolve) => setTimeout(resolve, delay));
  return delay;
}

export function getRequestId(): string {
  return randomUUID();
}

export function getRunId(request: Request): string | null {
  const runId = request.headers.get('x-lab-run-id')?.trim() || 'default';
  return RUN_ID_PATTERN.test(runId) ? runId : null;
}

export function applyLabHeaders(response: Response, delay: number, requestId: string): Response {
  response.headers.set('x-lab-delay-ms', String(delay));
  response.headers.set('x-request-id', requestId);
  return response;
}
