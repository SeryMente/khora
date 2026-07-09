export interface InformationObject<TContent = unknown> {
  id: string;
  timestamp: number;
  source: 'bitacora' | 'cabina_opi_vri' | 'harmonia';
  content: TContent;
}
