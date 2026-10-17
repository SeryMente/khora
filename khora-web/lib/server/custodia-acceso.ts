import { getDb } from "./neon";
export async function poseeVolcado(usuario:string,id:string):Promise<boolean>{
 if(!usuario||!id)return false;
 const r=await getDb().query("SELECT id FROM volcado WHERE (id::text=$1 OR folio::text=$1) AND usuario=$2",[id,usuario]);
 return r.rows.length===1;
}
export async function poseeSesion(usuario:string,id:string):Promise<boolean>{
 if(!usuario||!id)return false;
 const r=await getDb().query("SELECT s.session_id FROM dictado_session s LEFT JOIN volcado v ON v.id=s.volcado_id WHERE s.session_id=$1 AND COALESCE(s.custodia_owner,s.checkpoint_usuario,v.usuario)=$2",[id,usuario]);
 return r.rows.length===1;
}
