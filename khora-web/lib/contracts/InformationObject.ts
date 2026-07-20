export interface Provenance {
  origen: string;
  driver: string | null;
  timestamp: string;
}

export interface ObjetoDeInformacion {
  id: string;
  texto: string;
  provenance: Provenance;
  metadata: Record<string, string>;
}
