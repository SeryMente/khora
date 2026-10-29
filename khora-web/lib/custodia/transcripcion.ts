/** A refusal reason is not proof that any local original was lost. */
export function bloqueoTranscripcion(sessionId:string,confirmadas:number,pendientes:number):{code:string;message:string}|null {
 if(!sessionId)return {code:"no_session",message:"No se enviará la transcripción final: esta captura no tiene una sesión identificada. Mantén abierta la pestaña y conserva el audio disponible; no se declarará archivado."};
 if(pendientes>0)return {code:"pending_uploads",message:`Transcripción final pendiente: ${confirmadas} parte(s) de audio confirmada(s) en servidor y ${pendientes} sin confirmación. Abre «Detalle de sincronización de audio» y reintenta la sincronización. No se ha declarado completo el audio.`};
 if(confirmadas===0)return {code:"no_verified_parts",message:"Transcripción final pendiente: todavía no hay partes de audio confirmadas como almacenadas y vinculadas a esta sesión. Mantén abierta la captura y revisa el detalle de sincronización. Este mensaje no prueba que el audio local se haya perdido."};
 return null;
}
