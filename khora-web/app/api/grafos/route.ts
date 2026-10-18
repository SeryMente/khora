import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { COOKIE_BOVEDA, desbloqueoVigente } from "@/lib/server/boveda";
import { readPair, nextChunk, judge, scopedPair } from "@/lib/server/graph-twins-store";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function reply(data:unknown,status=200){return NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store","Vary":"Cookie"}});}
async function identity(req:NextRequest,requireVault=true){const owner=(await auth())?.user?.email;if(!owner)return {error:reply({error:"no_autenticado"},401)};if(requireVault&&!desbloqueoVigente(req.cookies.get(COOKIE_BOVEDA)?.value))return {error:reply({error:"boveda_cerrada",detail:"Abre la bóveda únicamente para generar o ratificar; consultar el grafo no requiere PIN."},423)};return {owner};}
function failed(e:unknown){if(e instanceof Error&&e.message==="graph_scope_not_found")return reply({error:"graph_scope_not_found"},404);const message=e instanceof Error?e.message:"unknown";const safe=/^(graph_|approved_|concurrent_|extractor_|active_proposal_|judgment_|invalid_extraction|provenance_|leiden_)/.test(message)?message:"graph_operation_failed";return reply({error:safe,detail:"La operación no se declaró terminada. Los originales y los juicios previos no se han sustituido."},503);}
function scope(req:NextRequest){const q=req.nextUrl.searchParams,io=q.get("io_id")||q.get("ioId"),source=q.get("volcado_id")||q.get("volcadoId"),limit=q.has("limit")?Number(q.get("limit")):500;if((io&&!uuid.test(io))||(source&&!uuid.test(source))||!Number.isSafeInteger(limit)||limit<1)return {error:reply({error:"invalid_graph_scope"},400)};return {io,source,limit:Math.min(limit,2000)};}
async function scoped(req:NextRequest,owner:string,payload:Awaited<ReturnType<typeof readPair>>){const s=scope(req);if(s.error)return s.error;return reply(await scopedPair(owner,payload,s.io!,s.source!,s.limit!));}
export async function GET(req:NextRequest){const id=await identity(req,false);if(id.error)return id.error;try{const s=scope(req);if(s.error)return s.error;return await scoped(req,id.owner!,await readPair(id.owner!));}catch(e){return failed(e);}}
export async function POST(req:NextRequest){
 const id=await identity(req);if(id.error)return id.error;
 // No cross-origin mutation, even with an authenticated cookie.
 if(req.headers.get("origin")!==req.nextUrl.origin)return reply({error:"origin_required"},403);
 if(!req.headers.get("content-type")?.startsWith("application/json"))return reply({error:"json_required"},415);
 try{const s=scope(req);if(s.error)return s.error;const b=await req.json();if(b.action==="next")return await scoped(req,id.owner!,await nextChunk(id.owner!));
 if(b.action==="judge"&&uuid.test(b.proposal_id||"")&&uuid.test(b.request_id||"")&&/^[a-f0-9]{64}$/.test(b.item_id||"")&&(b.decision==="accept"||b.decision==="reject"))return await scoped(req,id.owner!,await judge(id.owner!,b.proposal_id,b.item_id,b.decision,b.request_id));
 return reply({error:"invalid_action"},400);
 }catch(e){return failed(e);}
}
