export interface ServerCaptura {
  id: string;
  texto: string;
  timestamp: string;
  tipo?: string;
  origen?: string;
  visibilidad?: string;
  secuencia?: number;
  hash?: string;
  hashPrevio?: string;
  forensics?: {
    geo?: { lat: number; long: number; accuracy: number };
    platform?: string;
    resolution?: string;
    timezone?: string;
    appVersion?: string;
    duracionCapturaMs?: number;
    ip?: string;
  };
  metadata?: {
    duracionDictado?: number;
    dispositivo?: string;
    latenciaGuardado?: number;
    erroresSync?: number;
  };
}
