export interface Provenance {
  origen: string;
  driver: string | null;
  timestamp: string;
  event_time?: string | null;
  capture_time?: string | null;
  custody?: string | null;
}

export interface ObjetoDeInformacion {
  id: string;
  texto: string;
  provenance: Provenance;
  metadata: Record<string, unknown>;
  raw_payload?: Uint8Array | string | null;
  source_schema?: string | null;
}
