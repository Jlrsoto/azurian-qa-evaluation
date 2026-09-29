import type { DocumentFields, DocumentStatus, FieldError } from '@/lib/validation';

export interface DocumentDTE extends DocumentFields {
  id: string;
  estado: DocumentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentSummary {
  total: number;
  montoTotal: number;
  porEstado: Record<DocumentStatus, number>;
}

export interface AuthUserDTO {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface ApiErrorBody {
  error: string;
  code: string;
  details?: FieldError[];
}
