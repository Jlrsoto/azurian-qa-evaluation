export interface DocumentDTE {
  id: string;
  tipoDte: string;
  folio: number;
  rutReceptor: string;
  monto: number;
  fechaEmision: string;
  estado: 'ACEPTADO' | 'PENDIENTE' | 'RECHAZADO';
}

const initialDocuments: DocumentDTE[] = [
  {
    id: "doc-1001",
    tipoDte: "DTE 33",
    folio: 1001,
    rutReceptor: "76.192.584-9",
    monto: 150000,
    fechaEmision: "2026-09-15",
    estado: "ACEPTADO",
  },
  {
    id: "doc-1002",
    tipoDte: "DTE 34",
    folio: 2045,
    rutReceptor: "96.885.120-K",
    monto: 3400000,
    fechaEmision: "2026-09-18",
    estado: "ACEPTADO",
  },
  {
    id: "doc-1003",
    tipoDte: "DTE 39",
    folio: 8812,
    rutReceptor: "15.421.990-4",
    monto: 45900,
    fechaEmision: "2026-09-20",
    estado: "PENDIENTE",
  },
];

declare global {
  // eslint-disable-next-line no-var
  var __azurianDocumentsStore: DocumentDTE[] | undefined;
}

if (!globalThis.__azurianDocumentsStore) {
  globalThis.__azurianDocumentsStore = [...initialDocuments];
}

export const documentsStore = {
  getAll: (): DocumentDTE[] => {
    return globalThis.__azurianDocumentsStore || [];
  },
  filterByRut: (rut?: string): DocumentDTE[] => {
    const docs = globalThis.__azurianDocumentsStore || [];
    if (!rut || rut.trim() === "") return docs;
    const cleanRut = rut.toLowerCase().replace(/[\.\-]/g, "");
    return docs.filter((d) =>
      d.rutReceptor.toLowerCase().replace(/[\.\-]/g, "").includes(cleanRut)
    );
  },
  add: (
    doc: Omit<DocumentDTE, "id" | "fechaEmision" | "estado"> & {
      fechaEmision?: string;
      estado?: 'ACEPTADO' | 'PENDIENTE' | 'RECHAZADO';
    }
  ): DocumentDTE => {
    const newDoc: DocumentDTE = {
      id: `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tipoDte: doc.tipoDte,
      folio: Number(doc.folio),
      rutReceptor: doc.rutReceptor,
      monto: Number(doc.monto),
      fechaEmision: doc.fechaEmision || new Date().toISOString().split("T")[0],
      estado: doc.estado || "ACEPTADO",
    };
    if (!globalThis.__azurianDocumentsStore) {
      globalThis.__azurianDocumentsStore = [];
    }
    globalThis.__azurianDocumentsStore.unshift(newDoc);
    return newDoc;
  },
};
