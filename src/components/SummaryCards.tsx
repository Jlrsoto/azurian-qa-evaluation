import type { DocumentSummary } from '@/lib/types';

interface SummaryCardsProps {
  summary: DocumentSummary | null;
}

function formatClp(value: number): string {
  return `$ ${value.toLocaleString('es-CL')} CLP`;
}

export default function SummaryCards({ summary }: SummaryCardsProps) {
  const items = [
    { label: 'Total documentos', value: summary ? String(summary.total) : '—' },
    { label: 'Aceptados', value: summary ? String(summary.porEstado.ACEPTADO) : '—' },
    { label: 'Pendientes', value: summary ? String(summary.porEstado.PENDIENTE) : '—' },
    { label: 'Rechazados', value: summary ? String(summary.porEstado.RECHAZADO) : '—' },
    { label: 'Monto total', value: summary ? formatClp(summary.montoTotal) : '—' },
  ];

  return (
    <section aria-label="Resumen de documentos" aria-busy={summary === null}>
      <dl className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {items.map((item) => (
          <div key={item.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</dt>
            <dd className="mt-1 text-xl font-bold text-slate-900">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
