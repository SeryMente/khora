import type {CapturaSnapshot} from './contrato';
export type LuzCustodia='azul'|'verde'|'amarillo'|'rojo';
export function firmaCustodia(s:Pick<CapturaSnapshot,'sessionId'|'texto'|'parcial'|'titulo'|'audioPartes'|'tipoEntrada'|'ofuscada'>){return JSON.stringify([s.sessionId,s.texto,s.parcial,s.titulo,s.audioPartes,s.tipoEntrada??'general',s.ofuscada??false]);}
/** A recovered checkpoint is not an archive. Old receipts never cover newer content. */
export function luzCustodia(p:{archivedReceipt:boolean;exactSnapshot:boolean;audioComplete:boolean;inFlight:boolean;confirmedFailure:boolean}):LuzCustodia{
 if(p.archivedReceipt)return 'azul';
 if(p.exactSnapshot&&p.audioComplete&&!p.inFlight)return 'verde';
 if(p.confirmedFailure&&!p.exactSnapshot)return 'rojo';
 return 'amarillo';
}
export const descripcionLuz:Record<LuzCustodia,string>={azul:'Registro archivado con recibo verificado',verde:'Contenido actual confirmado en recuperables',amarillo:'Confirmación del contenido actual pendiente',rojo:'Error de conservación detectado; revisa el detalle'};
