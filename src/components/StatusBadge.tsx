import { CheckCircle, Clock, XCircle } from 'lucide-react';
import type { DocumentStatus } from '@/lib/validation';

const STATUS_STYLES = {
  ACEPTADO: { label: 'Aceptado', badge: 'bg-emerald-100 text-emerald-800', icon: 'text-emerald-600', Icon: CheckCircle },
  PENDIENTE: { label: 'Pendiente', badge: 'bg-amber-100 text-amber-800', icon: 'text-amber-600', Icon: Clock },
  RECHAZADO: { label: 'Rechazado', badge: 'bg-red-100 text-red-800', icon: 'text-red-600', Icon: XCircle },
} as const;

export function statusLabel(status: DocumentStatus): string {
  return STATUS_STYLES[status].label;
}

export default function StatusBadge({ status }: { status: DocumentStatus }) {
  const { label, badge, icon, Icon } = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${badge}`}>
      <Icon className={`w-3.5 h-3.5 ${icon}`} /> {label}
    </span>
  );
}
