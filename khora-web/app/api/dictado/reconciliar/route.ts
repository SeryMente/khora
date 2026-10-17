import { after, NextResponse } from "next/server";
import { auth } from "@/auth";
import { reconciliarCustodia } from "@/lib/server/custodia-trabajos";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=300;
/** Session-authenticated, owner-scoped. No anonymous worker bypass or public audio URL. */
export async function POST() {
  const usuario=(await auth())?.user?.email;
  if(!usuario)return NextResponse.json({error:"no_autenticado"},{status:401});
  after(()=>reconciliarCustodia(usuario,2).then(()=>undefined).catch(()=>undefined));
  return NextResponse.json({estado:"solicitado",nota:"La respuesta no certifica finalización del trabajo"},{status:202,headers:{"Cache-Control":"no-store"}});
}
