// @l0 L0-002 · Verified manual release identity is distinct from Git integration metadata.
import { NextResponse } from "next/server";
export const dynamic="force-dynamic";
const conValor=(v?:string)=>typeof v==="string"&&v.trim()?v.trim():null;
export async function GET(){
 const git=conValor(process.env.VERCEL_GIT_COMMIT_SHA)??conValor(process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA);
 const manual=conValor(process.env.KHORA_RELEASE_SHA);
 const release=manual&&/^[a-f0-9]{40}$/i.test(manual)?manual:null;
 return NextResponse.json({commit:git??release??"sin-metadatos-de-git",rama:conValor(process.env.VERCEL_GIT_COMMIT_REF)??"sin-metadatos-de-git",desplegado_desde_git:git!==null,fuente_commit:git?"vercel-git":release?"manual-verified-clean-worktree":"no-verificado",entorno:conValor(process.env.VERCEL_ENV)??"local",rutas:["/sistema/custodia","/api/volcado"],ahora:new Date().toISOString()});
}
