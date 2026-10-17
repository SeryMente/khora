/** Opt-in worker. Uses existing service environment, never copies credentials or runs from MCP.
 * Default: read-only status. --execute --once performs bounded work; --execute polls until SIGINT.
 * This file is NOT started by installing dependencies or building the app.
 */
import { getDb } from "../lib/server/neon";
import { reconciliarCustodia } from "../lib/server/custodia-trabajos";
async function main() {
 const execute=process.argv.includes("--execute"),once=process.argv.includes("--once");
 const db=getDb(); let stop=false;process.on("SIGINT",()=>{stop=true;});process.on("SIGTERM",()=>{stop=true;});
 try {
  do {
   const owners=await db.query(`SELECT DISTINCT COALESCE(s.custodia_owner,s.checkpoint_usuario,v.usuario) AS usuario
    FROM dictado_session s LEFT JOIN volcado v ON v.id=s.volcado_id
    WHERE COALESCE(s.custodia_owner,s.checkpoint_usuario,v.usuario) IS NOT NULL ORDER BY usuario`);
   if(!execute){const state=await db.query("SELECT tipo,estado,count(*)::int AS cantidad FROM dictado_custodia_trabajo GROUP BY tipo,estado");console.log(JSON.stringify({modo:"solo_lectura",propietarios:owners.rows.length,trabajos:state.rows}));break;}
   for(const row of owners.rows){if(stop)break;await reconciliarCustodia(row.usuario,2);}
   console.log(JSON.stringify({modo:"ejecucion",propietarios:owners.rows.length,ciclo:"completo"}));
   if(!once&&!stop)await new Promise(resolve=>setTimeout(resolve,30000));
  }while(!once&&!stop);
 }finally{await db.end();}
}
main().catch(()=>{console.error("custodia_worker_fallido: consultar entorno y estado de trabajos, sin exponer secretos");process.exitCode=1;});
