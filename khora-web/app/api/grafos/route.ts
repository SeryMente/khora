import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { COOKIE_BOVEDA, desbloqueoVigente } from "@/lib/server/boveda";
import { readPair, nextChunk, judge } from "@/lib/server/graph-twins-store";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function reply(data:unknown,status=200){return NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store","Vary":"Cookie"}});}
async function identity(req:NextRequest){const owner=(await auth())?.user?.email;if(!owner)return {error:reply({error:"no_autenticado"},401)};if(!desbloqueoVigente(req.cookies.get(COOKIE_BOVEDA)?.value))return {error:reply({error:"boveda_cerrada",detail:"Abre la bóveda para consultar o generar tus grafos."},423)};return {owner};}
function failed(e:unknown){const message=e instanceof Error?e.message:"unknown";const safe=/^(graph_|approved_|concurrent_|extractor_|active_proposal_|judgment_|invalid_extraction|provenance_|leiden_)/.test(message)?message:"graph_operation_failed";return reply({error:safe,detail:"La operación no se declaró terminada. Los originales y los juicios previos no se han sustituido."},503);}
export async function GET(req:NextRequest){const id=await identity(req);if(id.error)return id.error;try{return reply(await readPair(id.owner!));}catch(e){return failed(e);}}
export async function POST(req:NextRequest){
 const id=await identity(req);if(id.error)return id.error;
 // No cross-origin mutation, even with an authenticated cookie.
 if(req.headers.get("origin")!==req.nextUrl.origin)return reply({error:"origin_required"},403);
 if(!req.headers.get("content-type")?.startsWith("application/json"))return reply({error:"json_required"},415);
 try{const b=await req.json();if(b.action==="next")return reply(await nextChunk(id.owner!));
 if(b.action==="judge"&&uuid.test(b.proposal_id||"")&&uuid.test(b.request_id||"")&&/^[a-f0-9]{64}$/.test(b.item_id||"")&&(b.decision==="accept"||b.decision==="reject"))return reply(await judge(id.owner!,b.proposal_id,b.item_id,b.decision,b.request_id));
 return reply({error:"invalid_action"},400);
 }catch(e){return failed(e);}
}
